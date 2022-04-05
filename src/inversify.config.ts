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
import { MessageService } from '@services/message-service';
import { Strings } from '@commands/system/strings';
import { Hiatus } from '@commands/hiatus/hiatus';
import { SessionMapper } from '@src/mappers/session.mapper';
import { SessionEdit } from '@commands/session/session-edit';
import { Show } from '@commands/user/show';
import { Qotd } from '@commands/misc/qotd';
import { QotdController } from '@controllers/feature/qotd-controller';
import { QotdAdmin } from '@commands/system/qotd-admin';
import { CharacterController } from '@controllers/feature/character-controller';
import { CanonCharacter } from '@commands/character/canon-character.command';
import { OriginalCharacter } from '@commands/character/original-character.command';
import { Info } from '@commands/system/info.command';
import { HiatusController } from '@controllers/feature/hiatus-controller';
import { ReminderController } from '@controllers/feature/reminder-controller';
import { TimestampController } from '@controllers/feature/timestamp-controller';
import { CharacterService } from '@services/feature/character-service';
import { HiatusService } from '@services/feature/hiatus-service';
import { QotdService } from '@services/feature/qotd-service';
import { ReminderService } from '@services/feature/reminder-service';
import { SessionService } from '@services/feature/session-service';
import { TimestampService } from '@services/feature/timestamp-service';
import { HiatusMapper } from '@src/mappers';
import { CharacterMapper } from '@src/mappers/character.mapper';

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
container.bind<HiatusController>(TYPES.HiatusController).to(HiatusController).inSingletonScope();
container.bind<QotdController>(TYPES.QotdController).to(QotdController).inSingletonScope();
container
    .bind<CharacterController>(TYPES.CharacterController)
    .to(CharacterController)
    .inSingletonScope();
container
    .bind<ReminderController>(TYPES.ReminderController)
    .to(ReminderController)
    .inSingletonScope();
container
    .bind<TimestampController>(TYPES.TimestampController)
    .to(TimestampController)
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
container.bind<CharacterService>(TYPES.CharacterService).to(CharacterService).inSingletonScope();
container.bind<HiatusService>(TYPES.HiatusService).to(HiatusService).inSingletonScope();
container.bind<QotdService>(TYPES.QotdService).to(QotdService).inSingletonScope();
container.bind<ReminderService>(TYPES.ReminderService).to(ReminderService).inSingletonScope();
container.bind<SessionService>(TYPES.SessionService).to(SessionService).inSingletonScope();
container.bind<TimestampService>(TYPES.TimestampService).to(TimestampService).inSingletonScope();

// Mappers
container.bind<SessionMapper>(TYPES.SessionMapper).to(SessionMapper).inSingletonScope();
container.bind<HiatusMapper>(TYPES.HiatusMapper).to(HiatusMapper).inSingletonScope();
container.bind<CharacterMapper>(TYPES.CharacterMapper).to(CharacterMapper).inSingletonScope();

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
