// organize-imports-ignore
// Don't reorder these because config needs to be loaded before any classes that use it
import { config } from 'dotenv';
config();
import container from './inversify.config';
import { TYPES } from '@src/types';
import { Server } from '@src/server';
import { Logger } from 'tslog';
import { connect } from 'mongoose';

const logger = container.get<Logger>(TYPES.BaseLogger);
const server = container.get<Server>(TYPES.Server);
const mongoDbConnectionString = container.get<string>(TYPES.MongoDbConnectionString);

run().then(() => logger.info('Finished startup sequence.'));

/**
 * Runs all startup sequences
 */
async function run() {
    await databaseStartup();
    await serverStartup();
}

/**
 * Starts up the database
 *
 * @returns Resolves when connected to mongoDB
 */
async function databaseStartup(): Promise<void> {
    logger.debug(`Connecting to MongoDB...`);
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

/**
 * Starts the node server
 */
async function serverStartup() {
    await server
        .listen()
        .then(() => {
            logger.info('#2 Server started and connected.');
        })
        .catch((error) => {
            logger.fatal('#2 Could not start server.', logger.prettyError(error));
            process.exit(1);
        });
}
