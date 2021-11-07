export const TYPES = {
    // Constants
    Server: Symbol('Server'),
    Client: Symbol('Client'),
    ClientId: Symbol('ClientId'),
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

    // Providers
    StringProvider: Symbol('StringProvider'),
    EmojiProvider: Symbol('EmojiProvider'),
    ConfigurationProvider: Symbol('ConfigurationProvider'),

    // Services
    PermissionService: Symbol('PermissionService'),
    HelperService: Symbol('HelperService'),
    UserService: Symbol('UserService'),
    ChannelService: Symbol('ChannelService'),
    MessageService: Symbol('MessageService'),

    // Commands
    Ping: Symbol('Ping'),
    SessionStart: Symbol('Start'),
    SessionFinish: Symbol('Finish'),
    SessionNext: Symbol('Next'),

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
