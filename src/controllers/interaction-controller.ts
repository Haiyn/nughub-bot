import { injectable } from 'inversify';
import { Controller } from '@controllers/controller';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import interactions from '@commands/interactions';

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
}
