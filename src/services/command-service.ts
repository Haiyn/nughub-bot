import { injectable } from "inversify";
import { TYPES } from "@src/types";
import { CommandContext } from "@models/command-context";
import { Message } from "discord.js";
import container from "@src/inversify.config";
import { Command } from "@src/commands";
import { Configuration } from "@models/configuration";


@injectable()
export class CommandService {
    private commandMapping = {
        "start": TYPES.SessionStart,
        "ping": TYPES.Ping
    }

    public getCommandContextFromMessage(message: Message): CommandContext {
        const splitMessage = message.content
            .slice(container.get<Configuration>(TYPES.Configuration).prefix.length)
            .trim()
            .split(/ +/g);

        const matchedCommand = container.get(this.commandMapping[splitMessage.shift()?.toLowerCase()]) as Command;
        if(!matchedCommand) return null;
        return new CommandContext(matchedCommand, message, splitMessage);
    }
}