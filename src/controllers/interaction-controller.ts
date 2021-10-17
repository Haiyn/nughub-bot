import { injectable } from 'inversify';
import { Controller } from '@controllers/controller';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import interactions from '@commands/interactions';
import { CommandInteraction, Interaction } from 'discord.js';
import { ApplicationCommand } from '@commands/interactions/application-command';
import container from '@src/inversify.config';
import { ApplicationCommandError } from '@models/application-command-error';

@injectable()
export class InteractionController extends Controller {
    public async registerApplicationCommands(): Promise<number> {
        // Set up requests
        const jsonPayload = [];
        for (let i = 0; i < interactions.length; i++) {
            jsonPayload.push(interactions[i].toJSON());
        }
        const rest = new REST({ version: '9' }).setToken(this.token);

        // Run requests
        try {
            this.logger.debug('Refreshing application commands...');

            await rest.put(Routes.applicationCommands(this.clientId), {
                body: interactions,
            });

            this.logger.debug('Successfully refreshed application commands.');
            return Promise.resolve(interactions.length);
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
        try {
            const applicationCommandName =
                'Application' +
                interaction.commandName.charAt(0).toUpperCase() +
                interaction.commandName.slice(1);
            const applicationCommand = container.get(applicationCommandName) as ApplicationCommand;
            await applicationCommand
                .run(interaction)
                .then((result) => {
                    this.logger.info(
                        `Interaction ID ${interaction.id}: Application Command ${
                            interaction.commandName
                        } was ${result.executed ? '' : 'not'} executed: ${result.message}`
                    );
                })
                .catch((error: ApplicationCommandError) => {
                    this.logger.error(error.internalMessage, this.logger.prettyError(error.error));
                    interaction.reply({
                        content: error.userMessage,
                        ephemeral: true,
                    });
                });
        } catch (error) {
            this.logger.error(`Failed: `, this.logger.prettyError(error));
        }
    }
}
