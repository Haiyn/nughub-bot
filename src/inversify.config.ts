import 'reflect-metadata';
import { Client, Intents } from 'discord.js';
import { Container } from 'inversify';
import {
    PermissionService,
    CommandService,
    MessageService,
    DatabaseService,
    HelperService,
    UserService,
    ChannelService,
} from '@services/index';
import { MessageController } from '@controllers/index';
import { TYPES } from '@src/types';
import { Server } from '@src/server';
import { Logger, TLogLevelName } from 'tslog';
import { Ping, SessionStart, SessionFinish } from '@src/commands';
import { SessionNext } from '@commands/session-next';
import { IConfiguration } from '@models/configuration';
import configLocal from '@config/config-local';
import configDev from '@config/config-dev';
import configProd from '@config/config-prod';

const container = new Container();

// Environment
container.bind<string>(TYPES.Token).toConstantValue(process.env.TOKEN);
container.bind<string>(TYPES.BaseLogLevel).toConstantValue(process.env.BASE_LOG_LEVEL);
container.bind<string>(TYPES.ServiceLogLevel).toConstantValue(process.env.SERVICE_LOG_LEVEL);
container.bind<string>(TYPES.CommandLogLevel).toConstantValue(process.env.COMMAND_LOG_LEVEL);
container.bind<string>(TYPES.IgnoreStackLevels).toConstantValue(process.env.IGNORE_STACK_LEVELS);
container.bind<string>(TYPES.BotOwnerId).toConstantValue(process.env.BOT_OWNER_ID);
container.bind<string>(TYPES.Environment).toConstantValue(process.env.ENVIRONMENT);
container.bind<string>(TYPES.MongoDbConnectionString).toConstantValue(process.env.MONGODB_CONNSTR);

// Configuration
let config;
switch (process.env.ENVIRONMENT) {
    case 'local':
        config = configLocal;
        break;
    case 'dev':
        config = configDev;
        break;
    case 'prod':
        config = configProd;
        break;
}
container.bind<IConfiguration>(TYPES.Configuration).toConstantValue(config);

// Constants
container.bind<Client>(TYPES.Client).toConstantValue(
    new Client({
        intents: [
            Intents.FLAGS.GUILD_MESSAGES,
            Intents.FLAGS.GUILD_MESSAGE_TYPING,
            Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
            Intents.FLAGS.GUILD_MEMBERS,
            Intents.FLAGS.GUILDS,
        ],
    })
);
container.bind<Logger>(TYPES.BaseLogger).toConstantValue(
    new Logger({
        name: 'Base Logger',
        minLevel: container.get<string>(TYPES.BaseLogLevel) as TLogLevelName,
        ignoreStackLevels: container.get<string>(TYPES.IgnoreStackLevels) as unknown as number,
    })
);
container.bind<Logger>(TYPES.ServiceLogger).toConstantValue(
    container.get<Logger>(TYPES.BaseLogger).getChildLogger({
        name: 'Service Logger',
        minLevel: container.get<string>(TYPES.ServiceLogLevel) as TLogLevelName,
        ignoreStackLevels: container.get<string>(TYPES.IgnoreStackLevels) as unknown as number,
    })
);
container.bind<Logger>(TYPES.CommandLogger).toConstantValue(
    container.get<Logger>(TYPES.BaseLogger).getChildLogger({
        name: 'Command Logger',
        minLevel: container.get<string>(TYPES.CommandLogLevel) as TLogLevelName,
        ignoreStackLevels: container.get<string>(TYPES.IgnoreStackLevels) as unknown as number,
    })
);

// Services
container.bind<Server>(TYPES.Server).to(Server).inSingletonScope();
container.bind<MessageController>(TYPES.MessageController).to(MessageController).inSingletonScope();
container.bind<MessageService>(TYPES.MessageService).to(MessageService).inSingletonScope();
container.bind<PermissionService>(TYPES.PermissionService).to(PermissionService).inSingletonScope();
container.bind<CommandService>(TYPES.CommandService).to(CommandService).inSingletonScope();
container.bind<DatabaseService>(TYPES.DatabaseService).to(DatabaseService).inSingletonScope();
container.bind<HelperService>(TYPES.HelperService).to(HelperService).inSingletonScope();
container.bind<UserService>(TYPES.UserService).to(UserService).inSingletonScope();
container.bind<ChannelService>(TYPES.ChannelService).to(ChannelService).inSingletonScope();

// Commands
container.bind<Ping>(TYPES.Ping).to(Ping).inRequestScope();
container.bind<SessionStart>(TYPES.SessionStart).to(SessionStart).inRequestScope();
container.bind<SessionFinish>(TYPES.SessionFinish).to(SessionFinish).inRequestScope();
container.bind<SessionNext>(TYPES.SessionNext).to(SessionNext).inRequestScope();

export default container;
