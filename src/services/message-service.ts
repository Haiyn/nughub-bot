import { TimestampActions } from '@models/components/timestamp-actions';
import { Hiatus } from '@models/jobs/hiatus';
import { TimestampStatus } from '@models/ui/timestamp-status';
import { ConfigurationProvider } from '@providers/configuration-provider';
import { ChannelService, UserService } from '@services/index';
import { Service } from '@services/service';
import { ButtonType, EmbedLevel, EmbedType, SessionModel, SessionTimestamp } from '@src/models';
import { EmbedProvider } from '@src/providers';
import { TYPES } from '@src/types';
import {
    Client,
    MessageActionRow,
    MessageButton,
    MessageEmbed,
    MessageOptions,
    TextChannel,
} from 'discord.js';
import { inject, injectable } from 'inversify';
import { Logger } from 'tslog';
import moment = require('moment');

/** Handles different functions in relation to the Discord Message objects */
@injectable()
export class MessageService extends Service {
    private readonly embedProvider: EmbedProvider;
    private readonly channelService: ChannelService;
    private readonly userService: UserService;

    constructor(
        @inject(TYPES.Client) client: Client,
        @inject(TYPES.CommandLogger) logger: Logger,
        @inject(TYPES.ConfigurationProvider) configuration: ConfigurationProvider,
        @inject(TYPES.EmbedProvider) embedProvider: EmbedProvider,
        @inject(TYPES.ChannelService) channelService: ChannelService,
        @inject(TYPES.ChannelService) userService: UserService
    ) {
        super(client, logger, configuration);
        this.embedProvider = embedProvider;
        this.channelService = channelService;
        this.userService = userService;
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

    // region TIMESTAMPS

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

        if (!session) {
            this.logger.error(`Couldn't find session for sessionTimestamp: ${sessionTimestamp}`);
            return '';
        }

        // Construct message
        let content = `**Channel:**\t<#${sessionTimestamp.channelId}>\n**User:**\t<@${session.currentTurn.userId}>\n**Character:**\t${session.currentTurn.name}\n\n`;
        content += `**Last Reply:** <t:${sessionTimestamp.timestamp}:F> (<t:${sessionTimestamp.timestamp}:R>)\n`;
        const embed = await this.embedProvider.get(EmbedType.Detailed, EmbedLevel.Info, {
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
     * @param newFooter The new content for the embed footer
     * @returns when done
     */
    public async editTimestamp(
        channelId: string,
        newStatus?: string,
        newContent?: string,
        newFooter?: string
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
        const updatedEmbed = new MessageEmbed(message.embeds[0]);
        if (newStatus) updatedEmbed.setTitle(newStatus);
        if (newContent) updatedEmbed.setDescription(newContent);
        if (newFooter || newFooter === '') updatedEmbed.setFooter(newFooter);
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

    // endregion

    // region HIATUS

    /**
     * Sends a hiatus post to the hiatus channel
     *
     * @param hiatus the hiatus data
     * @returns the message id
     */
    public async sendHiatus(hiatus: Hiatus): Promise<string> {
        let content = `**User:** <@${hiatus.user.id}>\n`;
        hiatus.expires
            ? (content += `**Until:** <t:${hiatus.expires}:D> (<t:${hiatus.expires}:R>)\n\n`)
            : '\n\n';
        content += `**Reason:** ${hiatus.reason}`;

        const embed = await this.embedProvider.get(EmbedType.Detailed, EmbedLevel.Guild, {
            authorName: hiatus.user.username,
            authorIcon: hiatus.user.avatarURL(),
            content: content,
        });

        const hiatusChannel = await this.channelService.getTextChannelByChannelId(
            await this.configuration.getString('Channels_HiatusChannelId')
        );

        const message = await hiatusChannel.send({ embeds: [embed] });
        return message.id;
    }

    /**
     * Edits an existing hiatus post with the new data
     *
     * @param hiatus the new hiatus data
     * @returns when done
     */
    public async editHiatus(hiatus: Hiatus): Promise<void> {
        let content = `**User:** <@${hiatus.user.id}>\n`;
        hiatus.expires
            ? (content += `**Until:** <t:${hiatus.expires}:D> (<t:${hiatus.expires}:R>)\n\n`)
            : '\n\n';
        content += `**Reason:** ${hiatus.reason}`;
        const footer = `✏️ Hiatus was edited on ${moment().utc().format('MMMM Do YYYY, h:mm A')}`;

        const embed = await this.embedProvider.get(EmbedType.Detailed, EmbedLevel.Guild, {
            authorName: hiatus.user.username,
            authorIcon: hiatus.user.avatarURL(),
            content: content,
            footer: footer,
        });

        const hiatusChannel: TextChannel = await this.channelService.getTextChannelByChannelId(
            await this.configuration.getString('Channels_HiatusChannelId')
        );

        const hiatusPost = await hiatusChannel.messages.fetch(hiatus.hiatusPostId);
        await hiatusPost.edit({ embeds: [embed] });
    }

    public async deleteHiatus(userId: string): Promise<void> {}

    // endregion
}
