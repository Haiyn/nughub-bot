export const TYPES = {
    // Constants
    Server: Symbol('Server'),
    Client: Symbol('Client'),
    ClientId: Symbol('ClientId'),
    Token: Symbol('Token'),
    Configuration: Symbol('Configuration'),
    BotOwnerId: Symbol('BotOwnerId'),
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

    // Services
    PermissionService: Symbol('PermissionService'),
    CommandService: Symbol('CommandService'),
    HelperService: Symbol('HelperService'),
    UserService: Symbol('UserService'),
    ChannelService: Symbol('ChannelService'),
    MessageService: Symbol('MessageService'),

    // Commands
    Ping: Symbol('ping'),
    SessionStart: Symbol('start'),
    SessionFinish: Symbol('finish'),
    SessionNext: Symbol('next'),

    // Application Commands
    ApplicationPing: Symbol('ApplicationPing'),
    ApplicationSessionStart: Symbol('ApplicationStart'),

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
