import { config } from 'dotenv';
config();
import container from './inversify.config';
import { TYPES } from '@src/types';
import { Server } from '@src/server';
import { Logger } from 'tslog';
import { DatabaseService } from '@src/services';

const logger = container.get<Logger>(TYPES.BaseLogger);
const server = container.get<Server>(TYPES.Server);
const databaseService = container.get<DatabaseService>(TYPES.DatabaseService);

run().then(() => logger.info('Ready!'));

async function run() {
    await databaseStartup();
    await serverStartup();
}

async function databaseStartup(): Promise<void> {
    await databaseService
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
