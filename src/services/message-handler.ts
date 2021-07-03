import { Message } from "discord.js";
import {inject, injectable} from "inversify";
import { TYPES } from "@src/types";
import { PrefixFinder, BotFinder, PermissionHandler } from "@services/index";
import { CommandContext } from "@models/command-context";
import { Command, Ping } from "@src/commands";
import container from "@src/inversify.config";
import {Logger} from "tslog";

@injectable()
export class MessageHandler {
    private prefixFinder: PrefixFinder;
    private botFinder: BotFinder;
    private permissionHandler: PermissionHandler;
    private commandList: Command[];
    private readonly logger: Logger;

    constructor(
        @inject(TYPES.PrefixFinder) prefixFinder: PrefixFinder,
        @inject(TYPES.BotFinder) botFinder: BotFinder,
        @inject(TYPES.PermissionHandler) permissionHandler: PermissionHandler,
        @inject(TYPES.ServiceLogger) logger: Logger,
    ) {
        this.prefixFinder = prefixFinder;
        this.botFinder = botFinder;
        this.permissionHandler = permissionHandler;
        this.logger = logger;

        // TODO: This is ugly as shit, jesus christ, make it dynamic
        const commandClasses = [
            Ping
        ];

        this.commandList = commandClasses.map((CommandClass) => new CommandClass());
    }

    async handleMessage(message: Message): Promise<void> {
        if (this.botFinder.isBot(message) || !this.prefixFinder.isPrefixed(message)) {
            this.logger.debug(`Message ID ${message.id}: Skipping.`);
            return await Promise.resolve();
        }

        const commandContext = new CommandContext(message);
        const matchedCommand = this.commandList.find((command) =>
            command.names.includes(commandContext.parsedCommandName),
        );

        if (!matchedCommand) {
            this.logger.debug(`Message ID ${message.id}: Could not match command "${message.content.substr(1, message.content.indexOf(" "))}".`);
            await message.reply("I don't recognize that command. Try !help.");
            return;
        } else if (!this.permissionHandler.hasPermission(commandContext, matchedCommand)) {
            this.logger.debug(`Message ID ${message.id}: User is not authorized for command "${matchedCommand.names[0]}".
                User ID: ${commandContext.author.id}
                User roles: ${commandContext.originalMessage.member.roles}`);
            await message.reply("You aren't allowed to use that command. Try !help.");
            return;
        }

        await matchedCommand.run(commandContext)
            .then(() => {
                this.logger.debug(`Message ID ${message.id}: Successfully ran command: ${matchedCommand.names[0]}`);
                //reactor.success(message);
            })
            .catch((error) => {
                this.logger.error(`Message ID ${message.id}: Could not run command: ${matchedCommand.names[0]}`, error);
                //reactor.failure(message);
            });

        return Promise.resolve();
    }
}