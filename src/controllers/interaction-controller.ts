import { Command } from '@commands/command';
import commandDefinitions from '@commands/definitions';
import { Controller } from '@controllers/controller';
import { JobRuntimeController } from '@controllers/job-runtime-controller';
import { REST, RouteLike } from '@discordjs/rest';
import { CommandError } from '@models/commands/command-error';
import { CommandValidationError } from '@models/commands/command-validation-error';
import { ConfigurationError } from '@models/config/configuration-error';
import { ButtonType } from '@models/ui/button-type';
import { EmbedLevel } from '@models/ui/embed-level';
import { EmbedType } from '@models/ui/embed-type';
import container from '@src/inversify.config';
import { ConfigurationProvider, EmbedProvider, PermissionProvider } from '@src/providers';
import { InteractionService } from '@src/services';
import { TYPES } from '@src/types';
import { Routes } from 'discord-api-types/v9';
import { ButtonInteraction, Client, CommandInteraction, Interaction } from 'discord.js';
import { inject, injectable } from 'inversify';
import { Logger } from 'tslog';

/** Registers interactions and handles all incoming interaction events */
@injectable()
export class InteractionController extends Controller {
    readonly interactionService: InteractionService;
    readonly jobRuntimeController: JobRuntimeController;

    constructor(
        @inject(TYPES.InteractionService) interactionService: InteractionService,
        @inject(TYPES.BaseLogger) logger: Logger,
        @inject(TYPES.Client) client: Client,
        @inject(TYPES.GuildId) guildId: string,
        @inject(TYPES.Token) token: string,
        @inject(TYPES.ConfigurationProvider) configuration: ConfigurationProvider,
        @inject(TYPES.EmbedProvider) embedProvider: EmbedProvider,
        @inject(TYPES.PermissionProvider) permissionProvider: PermissionProvider,
        @inject(TYPES.JobRuntimeController) jobRuntimeController: JobRuntimeController
    ) {
        super(logger, guildId, token, client, configuration, embedProvider, permissionProvider);
        this.interactionService = interactionService;
        this.jobRuntimeController = jobRuntimeController;
    }

    /**
     * Registers the Application commands from src/commands/definitions in the guild scope
     * Deletes any global commands because global commands take too long to register. Guild commands are instant.
     *
     * @returns Resolves with the amount of application commands registered
     */
    public async registerApplicationCommands(): Promise<number> {
        try {
            // Set up requests
            const jsonPayload = [];
            for (let i = 0; i < commandDefinitions.length; i++) {
                jsonPayload.push(commandDefinitions[i].toJSON());
            }
            const rest = new REST({ version: '9' }).setToken(this.token);

            // Run requests
            this.logger.debug('Refreshing application commands...');

            // Delete any global commands
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            rest.get(Routes.applicationCommands(this.client.user.id)).then((data: any) => {
                const promises = [];
                for (const command of data) {
                    const deleteUrl = `${Routes.applicationCommands(this.client.user.id)}/${
                        command.id
                    }`;
                    promises.push(rest.delete(<RouteLike>deleteUrl));
                }
                return Promise.all(promises);
            });

            // Register guild commands
            await rest.put(
                Routes.applicationGuildCommands(
                    this.client.user.id,
                    container.get<string>(TYPES.GuildId)
                ),
                {
                    body: commandDefinitions,
                }
            );

            this.logger.debug('Successfully refreshed application commands.');
            return Promise.resolve(commandDefinitions.length);
        } catch (error) {
            this.logger.fatal(
                'Failed to register application commands: ',
                this.logger.prettyError(error)
            );
            return Promise.reject();
        }
    }

    /**
     * Registers the permission for the application commands
     *
     * @returns Resolves when done, rejects when failed
     */
    public async registerApplicationCommandPermissions(): Promise<void> {
        const rest = new REST({ version: '9' }).setToken(this.token);
        const guild = await this.client.guilds.cache.get(this.guildId);

        await rest.get(Routes.applicationGuildCommands(this.client.user.id, this.guildId)).then(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            async (data: any) => {
                for (const command of data) {
                    try {
                        const registeredCommand = await guild?.commands.fetch(command.id);
                        const applicationCommand = this.getCommandFromCommandName(
                            registeredCommand.name
                        );
                        const permissions =
                            await this.permissionProvider.mapCommandToCommandPermissions(
                                applicationCommand,
                                guild
                            );

                        await registeredCommand.permissions.add({ permissions });
                    } catch (error) {
                        this.logger.fatal(
                            `Failed to construct and add permissions: `,
                            this.logger.prettyError(error)
                        );
                        return Promise.reject();
                    }
                }
            }
        );

        return Promise.resolve();
    }

    /**
     * Gets a Command type class via a name
     *
     * @param name The name of the command to get
     * @returns The fetched command
     */
    private getCommandFromCommandName(name: string): Command {
        this.logger.debug(`Matching command for command name: ${name}...`);
        const applicationCommandName = name.charAt(0).toUpperCase() + name.slice(1);
        return container.get(applicationCommandName) as Command;
    }

    /**
     * Receives every interaction and handles it according to interaction type
     *
     * @param interaction The received interaction
     * @returns Resolves when handled
     */
    public async handleInteraction(interaction: Interaction): Promise<void> {
        if (interaction.isCommand()) {
            await this.handleApplicationCommand(interaction as CommandInteraction).catch(
                (error) => {
                    this.logger.error(`Unhandled Error:`, this.logger.prettyError(error.error));
                }
            );
        }
        if (interaction.isButton()) {
            await this.handleButtonInteraction(interaction as ButtonInteraction).catch((error) => {
                this.logger.error(
                    `Unhandled Button Interaction error: `,
                    this.logger.prettyError(error.error)
                );
            });
        }
    }

    /**
     * Handles an interaction of the type application command
     *
     * @param interaction The received application command interaction
     * @returns Resolves when handled
     */
    private async handleApplicationCommand(interaction: CommandInteraction): Promise<void> {
        const applicationCommand = this.getCommandFromCommandName(interaction.commandName);

        // Validate the inputs
        let valid = true;
        await applicationCommand.validateOptions(interaction.options).catch((error) => {
            this.handleInteractionError(interaction, error);
            valid = false;
        });
        if (!valid) return Promise.resolve();

        // Run the command
        await applicationCommand
            .run(interaction)
            .then((result) => {
                this.logger.info(
                    `Interaction ID ${interaction.id}: Application Command ${
                        interaction.commandName
                    } was ${result.executed ? '' : 'not'} executed: ${result.message}`
                );
            })
            .catch((error) => {
                this.handleInteractionError(interaction, error);
            });
    }

    /**
     * Handles all button interactions
     *
     * @param interaction The incoming button interaction
     * @returns when done
     */
    private async handleButtonInteraction(interaction: ButtonInteraction): Promise<void> {
        this.logger.trace(interaction);
        const buttonType = interaction.customId.slice(0, interaction.customId.indexOf(':'));
        switch (buttonType) {
            case ButtonType.SkipPrompt:
                await this.jobRuntimeController.handleSkipPromptInteraction(interaction);
        }
    }

    /**
     * Handles all errors that can be thrown while handling an interaction
     *
     * @param interaction The interaction during which the error was thrown
     * @param error The error that was thrown
     */
    private async handleInteractionError(interaction: CommandInteraction, error: unknown) {
        let userMessage;
        let embedType = EmbedType.Minimal;
        let embedLevel = EmbedLevel.Error;
        let title = '';
        // Check which type of error was thrown to avoid producing more errors in catch clause
        if (error instanceof CommandValidationError) {
            // Further user input validation failed
            this.logger.info(
                `Interaction ID ${interaction.id}: Application Command ${interaction.commandName} validation at runtime failed: ${error.internalMessage}`
            );
            embedLevel = EmbedLevel.Warning;
            title = 'Warning';
            userMessage = error.userMessage;
            if (error.isInternal) {
                embedType = EmbedType.Technical;
            }
        } else if (error instanceof CommandError) {
            // Command failed with caught error
            this.logger.error(
                `Interaction ID ${interaction.id}: Application Command ${interaction.commandName} command failed while executing: ${error.internalMessage}`,
                error.error ? this.logger.prettyError(error.error) : null
            );
            userMessage = error.userMessage;
        } else if (error instanceof ConfigurationError) {
            // Issue with config
            this.logger.error(
                `Interaction ID ${interaction.id}: Application Command ${interaction.commandName} could not fetch configuration properly: ${error.message}`,
                error.error ? this.logger.prettyError(error.error) : null
            );
            userMessage = `Internal Error: \`Could not retrieve configuration.\``;
        } else {
            // Command failed unexpectedly
            this.logger.error(
                `Interaction ID ${interaction.id}: Application Command ${interaction.commandName} failed unexpectedly while executing: `,
                this.logger.prettyError(error as Error)
            );
            userMessage = `Internal Error: \`Command execution failed unexpectedly.\``;
        }

        // Reply to the user if it hasn't happened already
        if (!interaction.replied) {
            const embedReply = await this.embedProvider.get(embedType, embedLevel, {
                title: title,
                content: userMessage,
            });
            await this.interactionService.reply(interaction, {
                embeds: [embedReply],
                ephemeral: true,
            });
        }
    }
}
