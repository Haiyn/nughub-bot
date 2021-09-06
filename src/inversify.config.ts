import "reflect-metadata";
import { Client, Intents } from "discord.js";
import { Container } from "inversify";
import { PermissionService, CommandService, MessageService, DatabaseService } from "@services/index";
import { MessageController } from "@controllers/index";
import { TYPES } from "@src/types";
import { Server } from "@src/server";
import { Logger, TLogLevelName } from "tslog";
import { Command, Ping } from "@src/commands";

const container = new Container();

// Environment
container.bind<string>(TYPES.Token).toConstantValue(process.env.TOKEN);
container.bind<string>(TYPES.Prefix).toConstantValue(process.env.PREFIX);
container.bind<string>(TYPES.BaseLogLevel).toConstantValue(process.env.BASE_LOG_LEVEL);
container.bind<string>(TYPES.ServiceLogLevel).toConstantValue(process.env.SERVICE_LOG_LEVEL);
container.bind<string>(TYPES.CommandLogLevel).toConstantValue(process.env.COMMAND_LOG_LEVEL);
container.bind<string>(TYPES.IgnoreStackLevels).toConstantValue(process.env.IGNORE_STACK_LEVELS);

// Constants
container.bind<Client>(TYPES.Client).toConstantValue(new Client({ intents: [
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MESSAGE_TYPING,
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
        Intents.FLAGS.GUILD_MEMBERS
    ]}
));
container.bind<Logger>(TYPES.BaseLogger).toConstantValue(new Logger({
    name: "Base Logger",
    minLevel: container.get<string>(TYPES.BaseLogLevel) as TLogLevelName,
    ignoreStackLevels: container.get<string>(TYPES.IgnoreStackLevels) as unknown as number,
}));
container.bind<Logger>(TYPES.ServiceLogger).toConstantValue(container.get<Logger>(TYPES.BaseLogger).getChildLogger({
    name: "Service Logger",
    minLevel: container.get<string>(TYPES.ServiceLogLevel) as TLogLevelName,
}));
container.bind<Logger>(TYPES.CommandLogger).toConstantValue(container.get<Logger>(TYPES.BaseLogger).getChildLogger({
    name: "Command Logger",
    minLevel: container.get<string>(TYPES.CommandLogLevel) as TLogLevelName,
}));

// Services
container.bind<Server>(TYPES.Server).to(Server).inSingletonScope();
container.bind<MessageController>(TYPES.MessageController).to(MessageController).inSingletonScope();
container.bind<MessageService>(TYPES.MessageService).to(MessageService).inSingletonScope();
container.bind<PermissionService>(TYPES.PermissionService).to(PermissionService).inSingletonScope();
container.bind<CommandService>(TYPES.CommandService).to(CommandService).inSingletonScope();
container.bind<DatabaseService>(TYPES.DatabaseService).to(DatabaseService).inSingletonScope();

// Commands
container.bind<Ping>(TYPES.Ping).to(Command).inRequestScope();


export default container;