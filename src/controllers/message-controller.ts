import { Message } from "discord.js";
import { inject, injectable } from "inversify";
import { TYPES } from "@src/types";
import { PermissionService, CommandService, MessageService } from "@src/services";
import { Logger } from "tslog";
import { MessageControllerResult } from "@models/message-controller-result";

@injectable()
export class MessageController {
    private readonly messageService: MessageService;
    private readonly permissionHandler: PermissionService;
    private readonly commandService: CommandService;
    private readonly logger: Logger;

    constructor(
        @inject(TYPES.MessageService) messageService: MessageService,
        @inject(TYPES.PermissionService) permissionService: PermissionService,
        @inject(TYPES.CommandService) commandService: CommandService,
        @inject(TYPES.ServiceLogger) logger: Logger,
    ) {
        this.messageService = messageService;
        this.permissionHandler = permissionService;
        this.commandService = commandService;
        this.logger = logger;
    }

    async handleMessage(message: Message): Promise<MessageControllerResult> {
        if (this.messageService.isBotMessage(message) || !this.messageService.isPrefixedMessage(message)) {
            this.logger.debug(`Message ID ${message.id}: Skipping.`);
            return new MessageControllerResult(false);
        }

        const commandContext = this.commandService.getCommandContextFromMessage(message);

        if (!commandContext) {
            this.logger.debug(`Message ID ${message.id}: Could not match command "${message.content.substr(1, message.content.indexOf(" "))}".`);
            await message.reply("I don't recognize that command. Try !help.");
            return new MessageControllerResult(false);
        }

        if (!this.permissionHandler.hasPermission(commandContext.originalMessage.member.roles, commandContext.command.permissionLevel)) {
            this.logger.debug(`Message ID ${message.id}: User is not authorized for command "${commandContext.command.names[0]}".
                User ID: ${commandContext.originalMessage.author.id}
                User roles: ${commandContext.originalMessage.member.roles}`);
            await message.reply("You aren't allowed to use that command. Try !help.");
            return new MessageControllerResult(false);
        }

        await commandContext.command.run(commandContext)
            .then((result) => {
                result.success ?
                    this.logger.info(`Message ID ${message.id}: Successfully ran command "${result.command.names[0]}": ${result.message}`) :
                    this.logger.info(`Message ID ${message.id}: Did not run command "${result.command.names[0]}": ${result.message}`);
                // reactor.success(message);
                return new MessageControllerResult(true);
            })
            .catch((result) => {
                this.logger.error(`Message ID ${message.id}: Could not run command "${commandContext.command.names[0]}": ${result.message}`,
                    result.error ? this.logger.prettyError(result.error): null);
                return new MessageControllerResult(false, result.error ? result.error : null);
            });
    }
}