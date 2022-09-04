import { Command } from '@commands/command';
import { CommandResult } from '@models/commands/command-result';
import { PermissionLevel } from '@models/permissions/permission-level';
import { EmbedLevel } from '@models/ui/embed-level';
import { EmbedType } from '@models/ui/embed-type';
import { CommandValidationError } from '@src/models';
import { CommandInteraction, CommandInteractionOptionResolver } from 'discord.js';
import { injectable } from 'inversify';

@injectable()
export class SayEmbed extends Command {
    public permissionLevel: PermissionLevel = PermissionLevel.Administrator;

    async run(interaction: CommandInteraction): Promise<CommandResult> {
        const title = interaction.options.getString('title');
        let description = interaction.options.getString('description');
        description = description.replace('\\n', '\n');
        const footer = interaction.options.getString('footer');
        const image = interaction.options.getString('image');
        const channel = interaction.options.getChannel('channel');

        const embedToSend = await this.embedProvider.get(EmbedType.Detailed, EmbedLevel.Guild, {
            content: description,
            title: title,
            footer: footer,
            image: image,
        });

        if (channel != null) {
            let textChannel = this.channelService.getTextChannelByChannelId(channel.id);
            await textChannel.send({ embeds: [embedToSend] });
        } else {
            await interaction.channel.send({ embeds: [embedToSend] });
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
            options.getString('description') == null ||
            options.getString('description').trim().length === 0
        ) {
            throw new CommandValidationError(
                'Trying to execute say embed command without description',
                'You must supply at least the description parameter to send an embed!'
            );
        }

        if (options.getString('description').length > 4096) {
            throw new CommandValidationError(
                'Trying to execute say embed command with description too long.',
                'The description is too long! It can have a maximum of 4096 characters.'
            );
        }

        if (options.getString('title') != null && options.getString('title').length > 256) {
            throw new CommandValidationError(
                'Trying to execute say embed command with title too long.',
                'The title is too long! It can have a maximum of 256 characters.'
            );
        }

        if (options.getString('footer') != null && options.getString('footer').length > 2048) {
            throw new CommandValidationError(
                'Trying to execute say embed command with title too long.',
                'The footer is too long! It can have a maximum of 2048 characters.'
            );
        }

        if (options.getString('image') != null) {
            try {
                new URL(options.getString('image'));
            } catch {
                throw new CommandValidationError(
                    'Trying to execute say embed command with invalid image link.',
                    'The image parameter you provided is not a valid link!'
                );
            }
        }
    }
}
