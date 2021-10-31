import { Command } from '@commands/command';
import commandDefinitions from '@commands/definitions';
import { Controller } from '@controllers/controller';
import { REST, RouteLike } from '@discordjs/rest';
import { CommandError } from '@models/commands/command-error';
import { CommandValidationError } from '@models/commands/command-validation-error';
import container from '@src/inversify.config';
import { TYPES } from '@src/types';
import { Routes } from 'discord-api-types/v9';
import { CommandInteraction, Interaction } from 'discord.js';
import { injectable } from 'inversify';

@injectable()
export class InteractionController extends Controller {
    public async registerApplicationCommands(): Promise<number> {
        // Set up requests
        const jsonPayload = [];
        for (let i = 0; i < commandDefinitions.length; i++) {
            jsonPayload.push(commandDefinitions[i].toJSON());
        }
        const rest = new REST({ version: '9' }).setToken(this.token);

        // Run requests
        try {
            this.logger.debug('Refreshing application commands...');

            // Delete any global commands
            rest.get(Routes.applicationCommands(this.clientId)).then((data: any) => {
                const promises = [];
                for (const command of data) {
                    const deleteUrl = `${Routes.applicationCommands(this.clientId)}/${command.id}`;
                    promises.push(rest.delete(<RouteLike>deleteUrl));
                }
                return Promise.all(promises);
            });

            // Register guild commands
            await rest.put(
                Routes.applicationGuildCommands(
                    this.clientId,
                    container.get<string>(TYPES.GuildId)
                ),
                {
                    body: commandDefinitions,
                }
            );

            this.logger.debug('Successfully refreshed application commands.');
            return Promise.resolve(commandDefinitions.length);
        } catch (error) {
            this.logger.error(
                'Failed to register application commands: ',
                this.logger.prettyError(error)
            );
            return Promise.reject();
        }
    }

    public async handleInteraction(interaction: Interaction): Promise<void> {
        if (interaction.isCommand()) {
            await this.handleApplicationCommand(interaction as CommandInteraction).catch(
                (error) => {
                    this.logger.error(`Unhandled Error:`, this.logger.prettyError(error.error));
                }
            );
        }
    }

    private async handleApplicationCommand(interaction: CommandInteraction): Promise<void> {
        // Match the Command by name
        const applicationCommandName =
            interaction.commandName.charAt(0).toUpperCase() + interaction.commandName.slice(1);
        const applicationCommand = container.get(applicationCommandName) as Command;

        // Validate the inputs
        let valid = true;
        await applicationCommand
            .validateOptions(interaction.options)
            .catch((error: CommandValidationError) => {
                // User input is not valid
                this.logger.info(error.internalMessage);
                interaction.reply({
                    content: error.userMessage,
                    ephemeral: true,
                });
                valid = false;
                // TODO: It continues to run the command despite going in here????
            })
            .catch((error) => {
                // Unexpected error
                this.logger.error(
                    `Interaction ID ${interaction.id}: Application Command ${interaction.commandName} failed unexpectedly while validating options: `,
                    this.logger.prettyError(error)
                );
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
            .catch((error: CommandValidationError) => {
                // Further user input validation failed
                this.logger.info(error.internalMessage);
                interaction.reply({
                    content: error.userMessage,
                    ephemeral: true,
                });
            })
            .catch((error: CommandError) => {
                // Command failed
                this.logger.error(
                    error.internalMessage,
                    error.error ? this.logger.prettyError(error.error) : null
                );
                interaction.reply({
                    content: error.userMessage,
                    ephemeral: true,
                });
            })
            .catch((error) => {
                // Command failed unexpectedly
                this.logger.error(
                    `Interaction ID ${interaction.id}: Application Command ${interaction.commandName} failed unexpectedly while executing: `,
                    this.logger.prettyError(error)
                );
            });
    }
}
