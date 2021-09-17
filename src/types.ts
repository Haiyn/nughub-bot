export const TYPES = {
    // Constants
    Server: Symbol("Server"),
    Client: Symbol("Client"),
    Token: Symbol("Token"),
    Configuration: Symbol("Configuration"),

    // Services
    MessageController: Symbol("MessageController"),
    MessageService: Symbol("MessageService"),
    PermissionService: Symbol("PermissionService"),
    CommandService: Symbol("CommandService"),
    DatabaseService: Symbol("DatabaseService"),
    HelperService: Symbol("HelperService"),
    UserService: Symbol("UserService"),
    ChannelService: Symbol("ChannelService"),

    // Commands
    Ping: Symbol("ping"),
    SessionStart: Symbol("start"),

    // Logging
    BaseLogLevel: Symbol("BaseLogLevel"),
    BaseLogger: Symbol("BaseLogger"),
    ServiceLogger: Symbol("ServiceLogger"),
    ServiceLogLevel: Symbol("ServiceLogLevel"),
    CommandLogger: Symbol("CommandLogger"),
    CommandLogLevel: Symbol("CommandLogLevel"),
    IgnoreStackLevels: Symbol("IgnoreStackLevels")
};