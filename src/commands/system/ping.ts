import { Command } from '@commands/command';
import { CommandResult } from '@models/commands/command-result';
import { EmbedLevel } from '@models/ui/embed-level';
import { EmbedType } from '@models/ui/embed-type';
import { CommandInteraction } from 'discord.js';
import { injectable } from 'inversify';

@injectable()
export class Ping extends Command {
    async run(interaction: CommandInteraction): Promise<CommandResult> {
        const start = new Date().getTime();

        const embedReply = await this.embedProvider.get(EmbedType.Technical, EmbedLevel.Info, {
            content: await this.stringProvider.get('COMMAND.PING.PENDING'),
        });
        await interaction.reply({
            embeds: [embedReply],
        });
        embedReply.setDescription(await this.stringProvider.get('COMMAND.PING.SUCCESS'));
        await interaction.editReply({
            embeds: [embedReply],
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
