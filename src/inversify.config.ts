// organize-imports-ignore
// Don't reorder these imports because reflect-metadata needs to be imported before any classes that use it
import 'reflect-metadata';
import { InteractionController, MessageController } from '@controllers/index';
import { ChannelService, HelperService, InteractionService, UserService } from '@services/index';
import { Ping, SessionFinish, SessionNext, SessionStart, Configuration } from '@src/commands';
import {
    EmojiProvider,
    StringProvider,
    EmbedProvider,
    ConfigurationProvider,
    PermissionProvider,
} from '@src/providers';
import { Server } from '@src/server';
import { TYPES } from '@src/types';
import { Client, Intents } from 'discord.js';
import { Container } from 'inversify';
import { Logger, TLogLevelName } from 'tslog';
import { ScheduleService } from '@services/schedule-service';
import { JobRuntimeController } from '@controllers/job-runtime-controller';
import { MessageService } from '@services/message-service';
import { Strings } from '@commands/system/strings';
import { Hiatus } from '@commands/hiatus/hiatus';
import { SessionMapper } from '@src/mappers/session.mapper';
import { SessionEdit } from '@commands/session/session-edit';
import { Show } from '@commands/user/show';
import { Qotd } from '@commands/misc/qotd';
import { QotdController } from '@controllers/qotd-controller';
import { QotdAdmin } from '@commands/system/qotd-admin';
import { CharacterChannelController } from '@controllers/character-channel-controller';
import { CanonCharacter } from '@commands/character/canon-character.command';
import { OriginalCharacter } from '@commands/character/original-character.command';
import { Info } from '@commands/system/info.command';

const container = new Container();

// Environment
container.bind<string>(TYPES.Token).toConstantValue(process.env.TOKEN);
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
container.bind<string>(TYPES.BotVersion).toConstantValue(process.env.BOT_VERSION);

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
        partials: ['MESSAGE', 'CHANNEL', 'REACTION'],
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
container
    .bind<JobRuntimeController>(TYPES.JobRuntimeController)
    .to(JobRuntimeController)
    .inSingletonScope();
container.bind<QotdController>(TYPES.QotdController).to(QotdController).inSingletonScope();
container
    .bind<CharacterChannelController>(TYPES.CharacterChannelController)
    .to(CharacterChannelController)
    .inSingletonScope();

// Providers
container.bind<StringProvider>(TYPES.StringProvider).to(StringProvider).inSingletonScope();
container.bind<EmojiProvider>(TYPES.EmojiProvider).to(EmojiProvider).inSingletonScope();
container
    .bind<ConfigurationProvider>(TYPES.ConfigurationProvider)
    .to(ConfigurationProvider)
    .inSingletonScope();
container.bind<EmbedProvider>(TYPES.EmbedProvider).to(EmbedProvider).inSingletonScope();
container
    .bind<PermissionProvider>(TYPES.PermissionProvider)
    .to(PermissionProvider)
    .inSingletonScope();

// Services
container
    .bind<InteractionService>(TYPES.InteractionService)
    .to(InteractionService)
    .inSingletonScope();
container.bind<HelperService>(TYPES.HelperService).to(HelperService).inSingletonScope();
container.bind<UserService>(TYPES.UserService).to(UserService).inSingletonScope();
container.bind<ChannelService>(TYPES.ChannelService).to(ChannelService).inSingletonScope();
container.bind<ScheduleService>(TYPES.ScheduleService).to(ScheduleService).inSingletonScope();
container.bind<MessageService>(TYPES.MessageService).to(MessageService).inSingletonScope();

// Mappers
container.bind<SessionMapper>(TYPES.SessionMapper).to(SessionMapper).inSingletonScope();

// Commands
container.bind<Ping>('Ping').to(Ping).inRequestScope();
container.bind<SessionStart>('Start').to(SessionStart).inRequestScope();
container.bind<SessionFinish>('Finish').to(SessionFinish).inRequestScope();
container.bind<SessionNext>('Next').to(SessionNext).inRequestScope();
container.bind<SessionEdit>('Edit').to(SessionEdit).inRequestScope();
container.bind<Configuration>('Configuration').to(Configuration).inRequestScope();
container.bind<Strings>('Strings').to(Strings).inRequestScope();
container.bind<Hiatus>('Hiatus').to(Hiatus).inRequestScope();
container.bind<Show>('Show').to(Show).inRequestScope();
container.bind<Qotd>('Qotd').to(Qotd).inRequestScope();
container.bind<QotdAdmin>('Qotdadmin').to(QotdAdmin).inRequestScope();
container.bind<CanonCharacter>('Cc').to(CanonCharacter).inRequestScope();
container.bind<OriginalCharacter>('Oc').to(OriginalCharacter).inRequestScope();
container.bind<Info>('Info').to(Info).inRequestScope();

export default container;
