// organize-imports-ignore
// Don't reorder these because config needs to be loaded before any classes that use it
import { config } from 'dotenv';
config();
import container from './inversify.config';
import { TYPES } from '@src/types';
import { Server } from '@src/server';
import { Logger } from 'tslog';
import { InteractionController } from '@src/controllers';
import { connect } from 'mongoose';

const logger = container.get<Logger>(TYPES.BaseLogger);
const server = container.get<Server>(TYPES.Server);
const interactionController = container.get<InteractionController>(TYPES.InteractionController);
const mongoDbConnectionString = container.get<string>(TYPES.MongoDbConnectionString);

run().then(() => logger.info('Finished startup sequence.'));

async function run() {
    await databaseStartup();
    await interactionStartup();
    await serverStartup();
}

async function databaseStartup(): Promise<void> {
    logger.debug(`Connecting to ${mongoDbConnectionString}`);
    return connect(mongoDbConnectionString)
        .then(() => {
            logger.info('#1 Successfully connected to MongoDB');
            return Promise.resolve();
        })
        .catch((error) => {
            logger.fatal(`Could not connect to MongoDB:`, logger.prettyError(error));
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
