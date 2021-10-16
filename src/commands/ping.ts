import { Command } from '@commands/command';
import { CommandContext } from '@models/command-context';
import { injectable } from 'inversify';
import { CommandResult } from '@models/command-result';

@injectable()
export class Ping extends Command {
    names = ['ping', 'p'];
    description = 'Pings the bot.';
    usageHint = '**Usage Hint:** `' + process.env.PREFIX + `${this.names[0]}\``;
    permissionLevel = 3;

    async run(context: CommandContext): Promise<CommandResult> {
        try {
            const pingMessage = await context.originalMessage.channel.send('Checking...');
            await pingMessage.edit(`(Squeaks regally)`);
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
