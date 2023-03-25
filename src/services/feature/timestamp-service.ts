import { TimestampActions } from '@models/components/timestamp-actions';
import { TimestampStatus } from '@models/ui/timestamp-status';
import { FeatureService } from '@services/feature/feature-service';
import { HiatusService } from '@services/feature/hiatus-service';
import { CharacterMapper } from '@src/mappers/character.mapper';
import {
    ButtonType,
    EmbedLevel,
    EmbedType,
    ISessionSchema,
    Session,
    SessionModel,
} from '@src/models';
import {
    ConfigurationProvider,
    EmbedProvider,
    EmojiProvider,
    StringProvider,
} from '@src/providers';
import { ChannelService, MessageService, ScheduleService, UserService } from '@src/services';
import { TYPES } from '@src/types';
import { Client, MessageActionRow, MessageButton, MessageEmbed } from 'discord.js';
import { inject, injectable } from 'inversify';
import { Logger } from 'tslog';
import moment = require('moment');

/** Handles different functions for timestamps */
@injectable()
export class TimestampService extends FeatureService {
    protected readonly hiatusService: HiatusService;

    constructor(
        @inject(TYPES.Client) client: Client,
        @inject(TYPES.CommandLogger) logger: Logger,
        @inject(TYPES.ConfigurationProvider) configuration: ConfigurationProvider,
        @inject(TYPES.EmbedProvider) embedProvider: EmbedProvider,
        @inject(TYPES.EmojiProvider) emojiProvider: EmojiProvider,
        @inject(TYPES.ChannelService) channelService: ChannelService,
        @inject(TYPES.UserService) userService: UserService,
        @inject(TYPES.HiatusService) hiatusService: HiatusService,
        @inject(TYPES.StringProvider) stringProvider: StringProvider,
        @inject(TYPES.ScheduleService) scheduleService: ScheduleService,
        @inject(TYPES.MessageService) messageService: MessageService,
        @inject(TYPES.CharacterMapper) characterMapper: CharacterMapper
    ) {
        super(
            client,
            logger,
            configuration,
            embedProvider,
            emojiProvider,
            channelService,
            userService,
            stringProvider,
            scheduleService,
            messageService,
            characterMapper
        );
        this.hiatusService = hiatusService;
    }

    /**
     * Sends an internal timestamp post to the timestamp channel
     *
     * @param session the session data to use
     * @returns the message id of the sent timestamp message
     */
    public async sendTimestamp(session: Session): Promise<string> {
        // Construct message
        const display = await this.userService.getMemberDisplay(session.currentTurn.member);
        const content = `**Channel:** ${session.isMainQuest ? '⭐' : ''} <#${
            session.channel.id
        }>\n**User:** ${display}\n**Character:**${session.currentTurn.name}\n\n`;
        const footer = await this.hiatusService.getUserHiatusStatus(session.currentTurn.member?.id);
        const embed = await this.embedProvider.get(EmbedType.Detailed, EmbedLevel.Info, {
            title: TimestampStatus.JustStarted,
            content: content,
            footer: footer,
        });

        const components = new MessageActionRow().addComponents([
            new MessageButton()
                .setCustomId(
                    `${ButtonType.Timestamp}:${TimestampActions.NotifyUser}:${session.channel.id}`
                )
                .setLabel('Notify User')
                .setStyle('PRIMARY')
                .setEmoji('💬'),
            new MessageButton()
                .setCustomId(
                    `${ButtonType.Timestamp}:${TimestampActions.AdvanceTurn}:${session.channel.id}`
                )
                .setLabel('Skip User')
                .setStyle('PRIMARY')
                .setEmoji('⏩'),
            new MessageButton()
                .setCustomId(
                    `${ButtonType.Timestamp}:${TimestampActions.Finish}:${session.channel.id}`
                )
                .setLabel('Finish RP')
                .setStyle('DANGER')
                .setEmoji('✖️'),
        ]);

        const timestampChannelId = await this.configuration.getString(
            'Channels_TimestampsChannelId'
        );
        const channel = await this.channelService.getTextChannelByChannelId(timestampChannelId);
        const message = await channel.send({ embeds: [embed], components: [components] });

        await SessionModel.findOneAndUpdate(
            { channelId: session.channel.id },
            { timestampPostId: message.id }
        );

        return message.id;
    }

    /**
     * Automatically update a timestamp with new data
     *
     * @param session the session to use
     * @param status the new timestamp status to set
     * @returns when done
     */
    public async updateTimestamp(session: ISessionSchema, status?: TimestampStatus): Promise<void> {
        const member = await this.userService.getGuildMemberById(session.currentTurn.userId);
        const display = await this.userService.getMemberDisplay(member);
        const footer = await this.hiatusService.getUserHiatusStatus(session.currentTurn.userId);
        let content = `**Channel:** ${session.isMainQuest ? '⭐' : ''} <#${
            session.channelId
        }>\n**User:** ${display}\n**Character:** ${session.currentTurn.name}\n\n`;
        if (session.lastTurnAdvance)
            content += `**Last Turn Advance:** <t:${moment(
                session.lastTurnAdvance
            ).unix()}:F> (<t:${moment(session.lastTurnAdvance).unix()}:R>)\n`;

        await this.editTimestamp(session.channelId, status, content, footer);
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
}
