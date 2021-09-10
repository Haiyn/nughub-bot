import { inject, injectable } from "inversify";
import { TYPES } from "@src/types";
import { CommandContext } from "@models/command-context";
import { Message } from "discord.js";
import container from "@src/inversify.config";
import { Command } from "@src/commands";


@injectable()
export class CommandService {
    private prefix: string;

    constructor(
        @inject(TYPES.Prefix) prefix: string,
    ) {
        this.prefix = prefix;
    }

    private commandMapping = {
        "start": TYPES.SessionStart,
        "ping": TYPES.Ping
    }

    public getCommandContextFromMessage(message: Message): CommandContext {
        const splitMessage = message.content
            .slice(process.env.PREFIX.length)
            .trim()
            .split(/ +/g);

        const matchedCommand = container.get(this.commandMapping[splitMessage.shift()?.toLowerCase()]) as Command;
        if(!matchedCommand) return null;
        return new CommandContext(matchedCommand, message, splitMessage);
    }
}