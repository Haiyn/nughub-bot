import { Command } from '@commands/command';
import { CommandResult } from '@models/commands/command-result';
import { CommandInteraction } from 'discord.js';
import { injectable } from 'inversify';

@injectable()
export class Ping extends Command {
    async run(interaction: CommandInteraction): Promise<CommandResult> {
        const start = new Date().getTime();
        await interaction.reply({
            content: await this.stringProvider.get('COMMAND.PING.PENDING'),
        });
        await interaction.editReply({
            content: await this.stringProvider.get('COMMAND.PING.SUCCESS'),
        });
        const end = new Date().getTime();
        return Promise.resolve({
            executed: true,
            message: `Successfully ponged. Latency is ${end - start} ms.`,
        });
    }

    async validateOptions(): Promise<void> {
        return;
    }
}
