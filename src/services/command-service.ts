import { injectable } from 'inversify';
import { TYPES } from '@src/types';
import { CommandContext } from '@models/command-context';
import { Message } from 'discord.js';
import container from '@src/inversify.config';
import { Command } from '@src/commands';
import { Service } from '@services/service';

@injectable()
export class CommandService extends Service {
    private commandMapping = {
        start: TYPES.SessionStart,
        ping: TYPES.Ping,
        finish: TYPES.SessionFinish,
        next: TYPES.SessionNext,
    };

    public getCommandContextFromMessage(message: Message): CommandContext {
        const splitMessage = message.content
            .slice(this.configuration.guild.prefix.length)
            .trim()
            .split(/ +/g);

        let matchedCommand;
        try {
            matchedCommand = container.get(
                this.commandMapping[splitMessage.shift()?.toLowerCase()]
            ) as Command;
        } catch (error) {
            this.logger.debug(
                `No command mapping was found for \"${splitMessage.shift()?.toLowerCase()}\"`
            );
            this.logger.trace('Command mapping could not be found because:', error);
        }
        if (!matchedCommand) return null;
        return new CommandContext(matchedCommand, message, splitMessage);
    }
}
