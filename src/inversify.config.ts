// organize-imports-ignore
// Don't reorder these imports because reflect-metadata needs to be imported before any classes that use it
import 'reflect-metadata';
import { InteractionController, MessageController } from '@controllers/index';
import {
    ChannelService,
    HelperService,
    MessageService,
    PermissionService,
    UserService,
} from '@services/index';
import { Ping, SessionFinish, SessionNext, SessionStart } from '@src/commands';
import { EmojiProvider, StringProvider } from '@src/providers';
import { Server } from '@src/server';
import { TYPES } from '@src/types';
import { Client, Intents } from 'discord.js';
import { Container } from 'inversify';
import { Logger, TLogLevelName } from 'tslog';
import { ConfigurationProvider } from '@providers/configuration-provider';

const container = new Container();

// Environment
container.bind<string>(TYPES.Token).toConstantValue(process.env.TOKEN);
container.bind<string>(TYPES.ClientId).toConstantValue(process.env.CLIENT_ID);
container.bind<string>(TYPES.BaseLogLevel).toConstantValue(process.env.BASE_LOG_LEVEL);
container.bind<string>(TYPES.ServiceLogLevel).toConstantValue(process.env.SERVICE_LOG_LEVEL);
container.bind<string>(TYPES.CommandLogLevel).toConstantValue(process.env.COMMAND_LOG_LEVEL);
container.bind<string>(TYPES.ProviderLogLevel).toConstantValue(process.env.PROVIDER_LOG_LEVEL);
container.bind<string>(TYPES.IgnoreStackLevels).toConstantValue(process.env.IGNORE_STACK_LEVELS);
container.bind<string>(TYPES.BotOwnerId).toConstantValue(process.env.BOT_OWNER_ID);
container.bind<string>(TYPES.GuildId).toConstantValue(process.env.GUILD_ID);
container.bind<string>(TYPES.Environment).toConstantValue(process.env.ENVIRONMENT);
container.bind<string>(TYPES.MongoDbConnectionString).toConstantValue(process.env.MONGODB_CONNSTR);
container.bind<string>(TYPES.RedisHost).toConstantValue(process.env.REDIS_HOST);
container.bind<string>(TYPES.RedisPort).toConstantValue(process.env.REDIS_PORT);
container.bind<string>(TYPES.RedisPassword).toConstantValue(process.env.REDIS_PASS);

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
container.bind<Logger>(TYPES.ProviderLogger).toConstantValue(
    container.get<Logger>(TYPES.BaseLogger).getChildLogger({
        name: 'Provider Logger',
        minLevel: container.get<string>(TYPES.ProviderLogLevel) as TLogLevelName,
        ignoreStackLevels: container.get<string>(TYPES.IgnoreStackLevels) as unknown as number,
    })
);

// Controllers
container.bind<Server>(TYPES.Server).to(Server).inSingletonScope();
container.bind<MessageController>(TYPES.MessageController).to(MessageController).inSingletonScope();
container
    .bind<InteractionController>(TYPES.InteractionController)
    .to(InteractionController)
    .inSingletonScope();

// Providers
container.bind<StringProvider>(TYPES.StringProvider).to(StringProvider).inSingletonScope();
container.bind<EmojiProvider>(TYPES.EmojiProvider).to(EmojiProvider).inSingletonScope();
container
    .bind<ConfigurationProvider>(TYPES.ConfigurationProvider)
    .to(ConfigurationProvider)
    .inSingletonScope();

// Services
container.bind<MessageService>(TYPES.MessageService).to(MessageService).inSingletonScope();
container.bind<PermissionService>(TYPES.PermissionService).to(PermissionService).inSingletonScope();
container.bind<HelperService>(TYPES.HelperService).to(HelperService).inSingletonScope();
container.bind<UserService>(TYPES.UserService).to(UserService).inSingletonScope();
container.bind<ChannelService>(TYPES.ChannelService).to(ChannelService).inSingletonScope();

// Commands
container.bind<Ping>('Ping').to(Ping).inRequestScope();
container.bind<SessionStart>('Start').to(SessionStart).inRequestScope();
container.bind<SessionFinish>('Finish').to(SessionFinish).inRequestScope();
container.bind<SessionNext>('Next').to(SessionNext).inRequestScope();

export default container;
