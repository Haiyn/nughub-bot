import { TimestampActions } from '@models/components/timestamp-actions';
import { Hiatus } from '@models/jobs/hiatus';
import { TimestampStatus } from '@models/ui/timestamp-status';
import { ConfigurationProvider } from '@providers/configuration-provider';
import { ChannelService, UserService } from '@services/index';
import { Service } from '@services/service';
import {
    ButtonType,
    ConfigurationKeys,
    EmbedLevel,
    EmbedType,
    HiatusModel,
    ISessionSchema,
    SessionModel,
    SessionTimestamp,
} from '@src/models';
import { EmbedProvider } from '@src/providers';
import { TYPES } from '@src/types';
import {
    Client,
    Message,
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
        @inject(TYPES.UserService) userService: UserService
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

    public async getMessageFromChannel(messageId: string, channelId: string): Promise<Message> {
        const channel = this.channelService.getTextChannelByChannelId(channelId);
        return await channel.messages.fetch(messageId);
    }

    // region SESSION POSTS

    /**
     * Updates the current turn indicator in the current sessions channel
     *
     * @param session The new session with the new current turn
     * @returns Resolves when sent
     */
    public async updateSessionPost(session: ISessionSchema): Promise<void> {
        const currentSessionsChannelId = await this.configuration.getString(
            ConfigurationKeys.Channels_CurrentSessionsChannelId
        );
        try {
            const sessionPost: Message = this.channelService
                .getTextChannelByChannelId(currentSessionsChannelId)
                .messages.cache.get(session.sessionPostId);

            let content = `<#${session.channelId}>\n\n\n`;
            for (const character of session.turnOrder) {
                const user = await this.userService.getUserById(character.userId);
                if (
                    user.id === session.currentTurn.userId &&
                    character.name === session.currentTurn.name
                )
                    content += ':arrow_right: ';
                content += `**${character.name}** - ${user.username} (${user}) `;

                const hasHiatus = await HiatusModel.findOne({ userId: user.id }).exec();
                if (hasHiatus) {
                    content += '⌛';
                }
                content += '\n\n';
            }

            sessionPost.embeds[0].setDescription(content);

            await sessionPost.edit({
                embeds: sessionPost.embeds,
                allowedMentions: { parse: [] },
            });
        } catch (error) {
            this.logger.error(`Could not edit session post.`, this.logger.prettyError(error));
            return Promise.reject();
        }
    }

    // endregion

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
        const user = await this.userService.getUserById(session.currentTurn.userId);
        let content = `**Channel:**\t<#${sessionTimestamp.channelId}>\n**User:** ${user.username} (${user})\n**Character:**\t${session.currentTurn.name}\n\n`;
        content += `**Last Turn Advance:** <t:${sessionTimestamp.timestamp}:F> (<t:${sessionTimestamp.timestamp}:R>)\n`;
        const embed = await this.embedProvider.get(EmbedType.Detailed, EmbedLevel.Info, {
            title: TimestampStatus.InTime,
            content: content,
        });

        const components = new MessageActionRow().addComponents([
            new MessageButton()
                .setCustomId(
                    `${ButtonType.Timestamp}:${TimestampActions.AdvanceTurn}:${sessionTimestamp.channelId}`
                )
                .setLabel('Skip User')
                .setStyle('PRIMARY')
                .setEmoji('⏩'),
            new MessageButton()
                .setCustomId(
                    `${ButtonType.Timestamp}:${TimestampActions.Finish}:${sessionTimestamp.channelId}`
                )
                .setLabel('Finish RP')
                .setStyle('DANGER')
                .setEmoji('❌'),
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
        newStatus?: TimestampStatus,
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
        const user = await this.userService.getUserById(hiatus.user.id);
        let content = `**User:** ${user.username} (${user})\n`;
        hiatus.expires
            ? (content += `**Until:** <t:${moment(hiatus.expires).unix()}:D> (<t:${moment(
                  hiatus.expires
              ).unix()}:R>)\n\n`)
            : (content += '\n');
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
        const user = await this.userService.getUserById(hiatus.user.id);
        let content = `**User:** ${user.username} (${user})\n`;
        hiatus.expires
            ? (content += `**Until:** <t:${moment(hiatus.expires).unix()}:D> (<t:${moment(
                  hiatus.expires
              ).unix()}:R>)\n\n`)
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

    public async deleteHiatus(hiatusPostId: string): Promise<void> {
        try {
            const hiatusChannel = await this.channelService.getTextChannelByChannelId(
                await this.configuration.getString('Channels_HiatusChannelId')
            );
            const hiatusPost: Message = await hiatusChannel.messages.fetch(hiatusPostId);
            if (!hiatusPost) {
                this.logger.warn(`Cannot delete hiatus post with ID ${hiatusPostId}!`);
                return;
            }
            await hiatusPost.delete();
        } catch (error) {
            this.logger.error(
                `Failed to delete hiatus post with ID ${hiatusPostId}`,
                this.logger.prettyError(error)
            );
        }
    }

    // endregion
}
