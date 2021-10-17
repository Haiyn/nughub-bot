import { SlashCommandBuilder } from '@discordjs/builders';
import { ApplicationCommand } from '@commands/interactions/application-command';
import { CommandInteraction } from 'discord.js';
import { ApplicationCommandResult } from '@src/interfaces/application-command-result.interface';
import { injectable } from 'inversify';

export const commandDefinition: SlashCommandBuilder = new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Pings the bot to see if it is alive.');

@injectable()
export class ApplicationPing extends ApplicationCommand {
    async run(interaction: CommandInteraction): Promise<ApplicationCommandResult> {
        const start = new Date().getTime();
        await interaction.reply({
            content: `Checking...`,
        });
        await interaction.editReply({
            content: `(squeaks regally)`,
        });
        const end = new Date().getTime();
        return Promise.resolve({
            executed: true,
            message: `Successfully ponged. Latency is ${end - start} ms.`,
        });
    }
}
