export const TYPES = {
    // Constants
    Server: Symbol("Server"),
    Client: Symbol("Client"),
    Token: Symbol("Token"),
    Prefix: Symbol("Prefix"),

    // Services
    MessageController: Symbol("MessageController"),
    MessageService: Symbol("MessageService"),
    PermissionService: Symbol("PermissionService"),
    CommandService: Symbol("CommandService"),

    // Commands
    Ping: Symbol("Ping"),

    // Logging
    BaseLogLevel: Symbol("BaseLogLevel"),
    BaseLogger: Symbol("BaseLogger"),
    ServiceLogger: Symbol("ServiceLogger"),
    ServiceLogLevel: Symbol("ServiceLogLevel"),
    CommandLogger: Symbol("CommandLogger"),
    CommandLogLevel: Symbol("CommandLogLevel"),
    IgnoreStackLevels: Symbol("IgnoreStackLevels")
};