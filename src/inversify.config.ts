import "reflect-metadata";
import { Client } from "discord.js";
import { Container } from "inversify";
import { MessageHandler, PrefixFinder, BotFinder, PermissionHandler } from "@services/index";
import { TYPES } from "@src/types";
import { Server } from "@src/server";
import {Logger, TLogLevelName} from "tslog";
import {Command, Ping} from "@src/commands";

let container = new Container();

// Environment
container.bind<string>(TYPES.Token).toConstantValue(process.env.TOKEN);
container.bind<string>(TYPES.Prefix).toConstantValue(process.env.PREFIX);
container.bind<string>(TYPES.BaseLogLevel).toConstantValue(process.env.BASE_LOG_LEVEL);
container.bind<string>(TYPES.ServiceLogLevel).toConstantValue(process.env.SERVICE_LOG_LEVEL);
container.bind<string>(TYPES.CommandLogLevel).toConstantValue(process.env.COMMAND_LOG_LEVEL);
container.bind<string>(TYPES.IgnoreStackLevels).toConstantValue(process.env.IGNORE_STACK_LEVELS);

// Constants
container.bind<Client>(TYPES.Client).toConstantValue(new Client());
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
container.bind<MessageHandler>(TYPES.MessageHandler).to(MessageHandler).inSingletonScope();
container.bind<PrefixFinder>(TYPES.PrefixFinder).to(PrefixFinder).inSingletonScope();
container.bind<BotFinder>(TYPES.BotFinder).to(BotFinder).inSingletonScope();
container.bind<PermissionHandler>(TYPES.PermissionHandler).to(PermissionHandler).inSingletonScope();

// Commands
container.bind<Ping>(TYPES.Ping).to(Command).inRequestScope();


export default container;