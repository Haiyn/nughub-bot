import { Command } from '@commands/command';
import { CommandContext } from '@models/command-context';
import { CommandResult } from '@models/command-result';
import { injectable } from 'inversify';

@injectable()
export class Ping extends Command {
    names = ['ping', 'p'];
    description = 'Pings the bot.';
    usageHint = '**Usage Hint:** `' + process.env.PREFIX + `${this.names[0]}\``;
    permissionLevel = 3;

    async run(context: CommandContext): Promise<CommandResult> {
        try {
            const pingMessage = await context.originalMessage.channel.send(
                await this.stringProvider.get('COMMAND.PING.STATUS.CHECKING')
            );
            await pingMessage.edit(await this.stringProvider.get('COMMAND.PING.STATUS.SUCCESSFUL'));
            return Promise.resolve(
                new CommandResult(
                    this,
                    context,
                    true,
                    `Successfully ponged, Latency is ${
                        pingMessage.createdTimestamp - context.originalMessage.createdTimestamp
                    }ms.`
                )
            );
        } catch (error) {
            return Promise.reject(
                new CommandResult(this, context, false, 'Ping command failed.', error)
            );
        }
    }
}
