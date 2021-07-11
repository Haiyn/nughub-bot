import { inject, injectable } from "inversify";
import { Command, Ping } from "@src/commands";
import { TYPES } from "@src/types";
import { CommandContext } from "@models/command-context";
import { Message } from "discord.js";


@injectable()
export class CommandService {
    private prefix: string;
    private commandList: Command[];

    constructor(
        @inject(TYPES.Prefix) prefix: string,
    ) {
        this.prefix = prefix;
        // TODO: This is ugly as shit, jesus christ, make it dynamic
        const commandClasses = [
            Ping
        ];

        this.commandList = commandClasses.map((CommandClass) => new CommandClass());
    }

    public getCommandContextFromMessage(message: Message): CommandContext {
        const splitMessage = message.content
            .slice(process.env.PREFIX.length)
            .trim()
            .split(/ +/g);

        const matchedCommand = this.commandList.find((command) =>
            command.names.includes(splitMessage.shift()?.toLowerCase()),
        );

        if(!matchedCommand) return null;
        return new CommandContext(matchedCommand, message, splitMessage);
    }
}