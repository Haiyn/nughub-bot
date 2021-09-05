import { config } from "dotenv";
config();
import container from "./inversify.config";
import { TYPES } from "@src/types";
import { Server } from "@src/server";
import { Logger } from "tslog";

const logger = container.get<Logger>(TYPES.BaseLogger);
const server = container.get<Server>(TYPES.Server);
server.listen().then(() => {
    logger.info("Server started and connected.");
}).catch((error) => {
    logger.fatal("Could not start server.", logger.prettyError(error));
});