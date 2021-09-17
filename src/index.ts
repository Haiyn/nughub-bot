import { config } from "dotenv";
config();
import container from "./inversify.config";
import { TYPES } from "@src/types";
import { Server } from "@src/server";
import { Logger } from "tslog";
import { DatabaseService } from "@src/services";
import { Confinode } from "confinode";
import { Configuration, description } from "@models/configuration";

const logger = container.get<Logger>(TYPES.BaseLogger);
const server = container.get<Server>(TYPES.Server);
const databaseService = container.get<DatabaseService>(TYPES.DatabaseService);

run().then(() => logger.info("Ready!"));

async function run() {
    await configurationStartup("config");
    await databaseStartup();
    serverStartup();
}


// It would be cleaner to inject the configuration as a dependency but the async Provider injection of inversify is
// absolute dogshit
async function configurationStartup(configurationFileName: string): Promise<void> {
    const confinode = new Confinode("botconfiguration", description);
    confinode.load(configurationFileName as string)
        .then((result) => {
            if(result == undefined) {
                logger.fatal("#1 Configuration file is undefined! Do the Confinode name parameter and filename match?");
                process.exit(1);
                return Promise.reject();
            }
            const configuration = result.configuration;
            container.bind<Configuration>(TYPES.Configuration).toConstantValue(configuration);
            logger.info("#1 Initialized Configuration.");
            logger.trace("Loaded config: " + container.get(TYPES.Configuration));
            return Promise.resolve();
        })
        .catch((error) => {
            logger.fatal("#1 Failed to load configuration file: ", logger.prettyError(error));
            process.exit(1);
            return Promise.reject();
        });
}

async function databaseStartup(): Promise<void> {
    databaseService.connect().then(() => {
        logger.info("#2 Connected to MongoDB.");
        return Promise.resolve();
    }).catch(() => {
        logger.fatal("#2 Could not connect to MongoDB");
        process.exit(1);
    });
}

function serverStartup() {
    server.listen().then(() => {
        logger.info("#3 Server started and connected.");
    }).catch((error) => {
        logger.fatal("#3 Could not start server.", logger.prettyError(error));
        process.exit(1);
    });
}
