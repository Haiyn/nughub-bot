import { config } from "dotenv";
config();
import container from "./inversify.config";
import { TYPES } from "@src/types";
import { Server } from "@src/server";
import { Logger } from "tslog";
import { DatabaseService } from "@src/services";

const logger = container.get<Logger>(TYPES.BaseLogger);
const server = container.get<Server>(TYPES.Server);
const databaseService = container.get<DatabaseService>(TYPES.DatabaseService);

databaseStartup();
serverStartup();

function databaseStartup() {
    databaseService.connect().then(() => {
        logger.info("Connected to MongoDB.");
    }).catch(() => {
        logger.fatal("Could not connect to MongoDB");
    });
}

function serverStartup() {
    server.listen().then(() => {
        logger.info("Server started and connected.");
    }).catch((error) => {
        logger.fatal("Could not start server.", logger.prettyError(error));
    });
}
