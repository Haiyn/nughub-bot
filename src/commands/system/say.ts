import { Command } from '@commands/command';
import { CommandResult } from '@models/commands/command-result';
import { PermissionLevel } from '@models/permissions/permission-level';
import { EmbedLevel } from '@models/ui/embed-level';
import { EmbedType } from '@models/ui/embed-type';
import { CommandValidationError } from '@src/models';
import { CommandInteraction, CommandInteractionOptionResolver } from 'discord.js';
import { injectable } from 'inversify';

@injectable()
export class Say extends Command {
    public permissionLevel: PermissionLevel = PermissionLevel.Administrator;

    async run(interaction: CommandInteraction): Promise<CommandResult> {
        this.logger.info('Running say command...');
        const message = interaction.options.getString('message');
        const channel = interaction.options.getChannel('channel');

        if (channel != null) {
            let textChannel = this.channelService.getTextChannelByChannelId(channel.id);
            await textChannel.send(message);
        } else {
            await interaction.channel.send(message);
        }

        const embedReply = await this.embedProvider.get(EmbedType.Technical, EmbedLevel.Info, {
            content: `Successfully sent message to <#${
                channel ? channel.id : interaction.channel.id
            }>.`,
        });
        await this.interactionService.reply(interaction, {
            embeds: [embedReply],
            ephemeral: true,
        });

        return Promise.resolve({
            executed: true,
            message: `Successfully sent message to.`,
        });
    }

    async validateOptions(options: CommandInteractionOptionResolver): Promise<void> {
        if (
            options.getString('message') == null ||
            options.getString('message').trim().length === 0
        ) {
            throw new CommandValidationError(
                'Trying to execute say command without message',
                'You must supply the message parameter to send a message!'
            );
        }
    }
}
