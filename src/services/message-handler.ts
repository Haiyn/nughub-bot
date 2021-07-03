import { Message } from "discord.js";
import { inject, injectable } from "inversify";
import { TYPES } from "@src/types";
import { PrefixFinder, BotFinder, PermissionHandler } from "@services/index";
import { CommandContext } from "@models/command-context";
import { Command, Ping } from "@src/commands";

@injectable()
export class MessageHandler {
    private prefixFinder: PrefixFinder;
    private botFinder: BotFinder;
    private permissionHandler: PermissionHandler;
    private commandList: Command[];

    constructor(
        @inject(TYPES.PrefixFinder) prefixFinder: PrefixFinder,
        @inject(TYPES.BotFinder) botFinder: BotFinder,
        @inject(TYPES.PermissionHandler) permissionHandler: PermissionHandler
    ) {
        this.prefixFinder = prefixFinder;
        this.botFinder = botFinder;
        this.permissionHandler = permissionHandler;

        const commandClasses = [
            Ping
        ];

        this.commandList = commandClasses.map((CommandClass) => new CommandClass());
    }

    async handleMessage(message: Message): Promise<void> {
        if (this.botFinder.isBot(message) || !this.prefixFinder.isPrefixed(message.content)) {
            await Promise.reject()
            return;
        }

        const commandContext = new CommandContext(message);

        const matchedCommand = this.commandList.find((command) =>
            command.names.includes(commandContext.parsedCommandName),
        );

        if (!matchedCommand) {
            await message.reply("I don't recognize that command. Try !help.");
            return;
        } else if (!this.permissionHandler.hasPermission(commandContext, matchedCommand)) {
            await message.reply("You aren't allowed to use that command. Try !help.");
            return;
        }

        await matchedCommand
            .run(commandContext)
            .then(() => {
                //reactor.success(message);
            })
            .catch((reason) => {
                //reactor.failure(message);
            });

        return Promise.resolve();
    }
}