import { TimestampActions } from '@models/components/timestamp-actions';
import { TimestampStatus } from '@models/ui/timestamp-status';
import { ConfigurationProvider } from '@providers/configuration-provider';
import { ChannelService } from '@services/index';
import { Service } from '@services/service';
import { ButtonType, EmbedLevel, EmbedType, SessionModel, SessionTimestamp } from '@src/models';
import { EmbedProvider } from '@src/providers';
import { TYPES } from '@src/types';
import { Client, MessageActionRow, MessageButton, MessageEmbed, MessageOptions } from 'discord.js';
import { inject, injectable } from 'inversify';
import { Logger } from 'tslog';

/** Handles different functions in relation to the Discord Message objects */
@injectable()
export class MessageService extends Service {
    private readonly channelService: ChannelService;
    private readonly embedProvider: EmbedProvider;

    constructor(
        @inject(TYPES.Client) client: Client,
        @inject(TYPES.CommandLogger) logger: Logger,
        @inject(TYPES.ConfigurationProvider) configuration: ConfigurationProvider,
        @inject(TYPES.EmbedProvider) embedProvider: EmbedProvider,
        @inject(TYPES.ChannelService) channelService: ChannelService
    ) {
        super(client, logger, configuration);
        this.channelService = channelService;
        this.embedProvider = embedProvider;
    }

    /**
     * Sends a message to the internal channel
     *
     * @param message The message to send
     * @returns Resolves when done
     */
    public async sendInternalMessage(message: MessageOptions): Promise<void> {
        const internalChannelId = await this.configuration.getString('Channels_InternalChannelId');
        const channel = await this.channelService.getTextChannelByChannelId(internalChannelId);
        await channel.send(message);
    }

    /**
     * Sends an internal timestamp post to the timestamp channel
     *
     * @param sessionTimestamp the timestamp data to use
     * @returns the message id of the sent timestamp message
     */
    public async sendTimestamp(sessionTimestamp: SessionTimestamp): Promise<string> {
        const session = await SessionModel.findOne({
            channelId: sessionTimestamp.channelId,
        }).exec();

        // Construct message
        let content = `**Channel:**\t<#${sessionTimestamp.channelId}>\n**User:**\t<@${session.currentTurn.userId}>\n**Character:**\t${session.currentTurn.name}\n\n`;
        content += `**Last Reply:** <t:${sessionTimestamp.timestamp}:F> (<t:${sessionTimestamp.timestamp}:R>)\n`;
        const embed = await this.embedProvider.get(EmbedType.Technical, EmbedLevel.Info, {
            title: TimestampStatus.InTime,
            content: content,
        });

        const components = new MessageActionRow().addComponents([
            new MessageButton()
                .setCustomId(
                    `${ButtonType.Timestamp}:${TimestampActions.AdvanceTurn}:${sessionTimestamp.channelId}`
                )
                .setLabel('Advance Turn')
                .setStyle('PRIMARY'),
            new MessageButton()
                .setCustomId(
                    `${ButtonType.Timestamp}:${TimestampActions.Finish}:${sessionTimestamp.channelId}`
                )
                .setLabel('Finish RP')
                .setStyle('DANGER'),
        ]);

        const timestampChannelId = await this.configuration.getString(
            'Channels_TimestampsChannelId'
        );
        const channel = await this.channelService.getTextChannelByChannelId(timestampChannelId);
        const message = await channel.send({ embeds: [embed], components: [components] });

        await SessionModel.findOneAndUpdate(
            { channelId: sessionTimestamp.channelId },
            { timestampPostId: message.id },
            { new: true }
        );

        return message.id;
    }

    /**
     * Edits an existing timestamp post with the new contents
     *
     * @param channelId The channelId for which the timestamp is posted
     * @param newStatus The new Timestamp status
     * @param newContent The new content for the embed description
     * @returns when done
     */
    public async editTimestamp(
        channelId: string,
        newStatus: string,
        newContent?: string
    ): Promise<void> {
        const session = await SessionModel.findOne({ channelId: channelId }).exec();

        if (!session?.timestampPostId) {
            this.logger.error(`No Timestamp Post ID present for ${channelId}! Cannot edit.`);
            return;
        }
        const timestampChannelId = await this.configuration.getString(
            'Channels_TimestampsChannelId'
        );
        const channel = await this.channelService.getTextChannelByChannelId(timestampChannelId);
        const message = await channel.messages.fetch(session.timestampPostId);
        const updatedEmbed = new MessageEmbed(message.embeds[0]).setTitle(newStatus);
        if (newContent) updatedEmbed.setDescription(newContent);
        message.edit({ embeds: [updatedEmbed] });
    }

    /**
     * Deletes a timestamp message when a session is finished
     *
     * @param channelId The channelId the timestamp message is posted for
     * @returns when done
     */
    public async deleteTimestamp(channelId: string): Promise<void> {
        const session = await SessionModel.findOne({ channelId: channelId }).exec();
        if (!session?.timestampPostId) {
            this.logger.error(`No Timestamp Post ID present for ${channelId}! Cannot delete.`);
            return;
        }
        const timestampChannelId = await this.configuration.getString(
            'Channels_TimestampsChannelId'
        );
        try {
            const channel = await this.channelService.getTextChannelByChannelId(timestampChannelId);
            await channel.messages
                .fetch(session.timestampPostId)
                .then((message) => message.delete());
        } catch (error) {
            this.logger.error(
                `Failed to delete timestamp for ${channelId}: `,
                this.logger.prettyError(error)
            );
            return;
        }
    }
}
