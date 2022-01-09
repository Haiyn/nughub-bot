export const TYPES = {
    // Constants
    Server: Symbol('Server'),
    Client: Symbol('Client'),
    Token: Symbol('Token'),
    BotOwnerId: Symbol('BotOwnerId'),
    GuildId: Symbol('GuildId'),
    Environment: Symbol('Environment'),
    MongoDbConnectionString: Symbol('MongoDbConnectionString'),
    RedisClient: Symbol('RedisClient'),
    RedisHost: Symbol('RedisHost'),
    RedisPort: Symbol('RedisPort'),
    RedisPassword: Symbol('RedisPassword'),

    // Controllers
    MessageController: Symbol('MessageController'),
    InteractionController: Symbol('InteractionController'),
    ReactionController: Symbol('ReactionController'),
    JobRuntimeController: Symbol('JobRuntimeController'),

    // Providers
    StringProvider: Symbol('StringProvider'),
    EmojiProvider: Symbol('EmojiProvider'),
    ConfigurationProvider: Symbol('ConfigurationProvider'),
    EmbedProvider: Symbol('EmbedProvider'),
    PermissionProvider: Symbol('PermissionProvider'),

    // Services
    HelperService: Symbol('HelperService'),
    UserService: Symbol('UserService'),
    ChannelService: Symbol('ChannelService'),
    InteractionService: Symbol('InteractionService'),
    ReactionService: Symbol('ReactionService'),
    ScheduleService: Symbol('ScheduleService'),
    MessageService: Symbol('MessageService'),

    // Commands
    Ping: Symbol('Ping'),
    SessionStart: Symbol('Start'),
    SessionFinish: Symbol('Finish'),
    SessionNext: Symbol('Next'),
    Configuration: Symbol('Configuration'),
    Strings: Symbol('Strings'),

    // Logging
    BaseLogLevel: Symbol('BaseLogLevel'),
    BaseLogger: Symbol('BaseLogger'),
    ServiceLogger: Symbol('ServiceLogger'),
    ServiceLogLevel: Symbol('ServiceLogLevel'),
    CommandLogger: Symbol('CommandLogger'),
    CommandLogLevel: Symbol('CommandLogLevel'),
    ProviderLogger: Symbol('ProviderLogger'),
    ProviderLogLevel: Symbol('ProviderLogLevel'),
    IgnoreStackLevels: Symbol('IgnoreStackLevels'),
};
