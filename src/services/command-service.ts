import {inject, injectable} from "inversify";
import { TYPES } from "@src/types";
import { CommandContext } from "@models/command-context";
import { Message } from "discord.js";
import container from "@src/inversify.config";
import { Command } from "@src/commands";
import { Configuration } from "@models/configuration";
import {Logger} from "tslog";


@injectable()
export class CommandService {
    private readonly logger: Logger;
    private commandMapping = {
        "start": TYPES.SessionStart,
        "ping": TYPES.Ping,
        "finish": TYPES.SessionFinish,
        "next": TYPES.SessionNext
    }

    constructor(
        @inject(TYPES.ServiceLogger) logger: Logger
    ) {
        this.logger = logger;
    }

    public getCommandContextFromMessage(message: Message): CommandContext {
        const splitMessage = message.content
            .slice(container.get<Configuration>(TYPES.Configuration).prefix.length)
            .trim()
            .split(/ +/g);

        let matchedCommand;
        try {
            matchedCommand = container.get(this.commandMapping[splitMessage.shift()?.toLowerCase()]) as Command;
        } catch(error) {
            this.logger.debug(`No command mapping was found for \"${splitMessage.shift()?.toLowerCase()}\"`);
        }
        if(!matchedCommand) return null;
        return new CommandContext(matchedCommand, message, splitMessage);

    }
}