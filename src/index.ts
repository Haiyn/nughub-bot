import { config } from 'dotenv';
config();
import container from './inversify.config';
import { TYPES } from '@src/types';
import { Server } from '@src/server';
import { Logger } from 'tslog';
import { DatabaseController, InteractionController } from '@src/controllers';

const logger = container.get<Logger>(TYPES.BaseLogger);
const server = container.get<Server>(TYPES.Server);
const databaseController = container.get<DatabaseController>(TYPES.DatabaseController);
const interactionController = container.get<InteractionController>(TYPES.InteractionController);

run().then(() => logger.info('Finished startup sequence.'));

async function run() {
    await databaseStartup();
    await interactionStartup();
    await serverStartup();
}

async function databaseStartup(): Promise<void> {
    await databaseController
        .connect()
        .then(() => {
            logger.info('#1 Connected to MongoDB.');
            return Promise.resolve();
        })
        .catch(() => {
            logger.fatal('#1 Could not connect to MongoDB');
            process.exit(1);
        });
}

async function interactionStartup(): Promise<void> {
    await interactionController
        .registerApplicationCommands()
        .then((result) => {
            logger.info(`#2 Registered ${result} interactions.`);
            return Promise.resolve();
        })
        .catch(() => {
            logger.fatal('#2 Could not register interactions.');
            process.exit(1);
        });
}

async function serverStartup() {
    await server
        .listen()
        .then(() => {
            logger.info('#3 Server started and connected.');
        })
        .catch((error) => {
            logger.fatal('#3 Could not start server.', logger.prettyError(error));
            process.exit(1);
        });
}
