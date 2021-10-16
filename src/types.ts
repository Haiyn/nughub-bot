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

    // Controllers
    MessageController: Symbol('MessageController'),
    MessageService: Symbol('MessageService'),
    DatabaseController: Symbol('DatabaseController'),
    InteractionController: Symbol('InteractionController'),

    // Services
    PermissionService: Symbol('PermissionService'),
    CommandService: Symbol('CommandService'),
    HelperService: Symbol('HelperService'),
    UserService: Symbol('UserService'),
    ChannelService: Symbol('ChannelService'),

    // Commands
    Ping: Symbol('ping'),
    SessionStart: Symbol('start'),
    SessionFinish: Symbol('finish'),
    SessionNext: Symbol('next'),

    // Logging
    BaseLogLevel: Symbol('BaseLogLevel'),
    BaseLogger: Symbol('BaseLogger'),
    ServiceLogger: Symbol('ServiceLogger'),
    ServiceLogLevel: Symbol('ServiceLogLevel'),
    CommandLogger: Symbol('CommandLogger'),
    CommandLogLevel: Symbol('CommandLogLevel'),
    IgnoreStackLevels: Symbol('IgnoreStackLevels'),
};
