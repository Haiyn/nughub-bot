import { FeatureService } from '@services/feature/feature-service';
import {
    EmbedLevel,
    EmbedType,
    Hiatus,
    HiatusModel,
    HiatusStatus,
    ISessionSchema,
} from '@src/models';
import { Message, TextChannel } from 'discord.js';
import { injectable } from 'inversify';
import moment = require('moment');

/** Handles different functions for hiatuses */
@injectable()
export class HiatusService extends FeatureService {
    // region HIATUS MESSAGES
    /**
     * Sends a hiatus post to the hiatus channel
     *
     * @param hiatus the hiatus data
     * @returns the message id
     */
    public async sendHiatus(hiatus: Hiatus): Promise<string> {
        const display = await this.userService.getMemberDisplay(hiatus.member);
        let content = `**User:** ${display}\n`;
        hiatus.expires
            ? (content += `**Until:** <t:${moment(hiatus.expires).unix()}:D> (<t:${moment(
                  hiatus.expires
              ).unix()}:R>)\n\n`)
            : (content += '\n');
        content += `**Reason:** ${hiatus.reason}`;

        const embed = await this.embedProvider.get(EmbedType.Detailed, EmbedLevel.Guild, {
            authorName: await this.userService.getEscapedDisplayName(hiatus.member),
            authorIcon: hiatus.member?.user?.avatarURL(),
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
        const display = await this.userService.getMemberDisplay(hiatus.member);
        let content = `**User:** ${display}\n`;
        hiatus.expires
            ? (content += `**Until:** <t:${moment(hiatus.expires).unix()}:D> (<t:${moment(
                  hiatus.expires
              ).unix()}:R>)\n\n`)
            : '\n\n';
        content += `**Reason:** ${hiatus.reason}`;
        const footer = `✏️ Hiatus was edited on ${moment().utc().format('MMMM Do YYYY, h:mm A')}`;

        const embed = await this.embedProvider.get(EmbedType.Detailed, EmbedLevel.Guild, {
            authorName: await this.userService.getEscapedDisplayName(hiatus.member),
            authorIcon: hiatus.member?.user?.avatarURL(),
            content: content,
            footer: footer,
        });

        const hiatusChannel: TextChannel = await this.channelService.getTextChannelByChannelId(
            await this.configuration.getString('Channels_HiatusChannelId')
        );

        const hiatusPost = await hiatusChannel.messages.fetch(hiatus.hiatusPostId);
        await hiatusPost.edit({ embeds: [embed] });
    }

    /**
     * Deletes a hiatus post
     *
     * @param hiatusPostId the id of the hiatus post
     * @returns when done
     */
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

    /**
     * Sends the welcome back message after a hiatus is finished
     *
     * @param hiatus the hiatus that is being finished
     * @param currentTurnsForUser an array of all the pending replies for the user
     * @param hasOverdueReply true if the user has a reply that has become overdue or is on last reminder
     * @returns true if successfully sent, false otherwise
     */
    public async sendWelcomeBackMessage(
        hiatus: Hiatus,
        currentTurnsForUser: ISessionSchema[],
        hasOverdueReply: boolean
    ): Promise<boolean> {
        const title = await this.stringProvider.get('JOB.WELCOME-BACK.TITLE');
        let content = await this.stringProvider.get('JOB.WELCOME-BACK.DESCRIPTION');
        content += '\n';

        if (!currentTurnsForUser || currentTurnsForUser?.length === 0) {
            content += await this.stringProvider.get(
                'JOB.WELCOME-BACK.DESCRIPTION.HAS-NO-OPEN-REPLIES'
            );
        } else {
            content += await this.stringProvider.get(
                'JOB.WELCOME-BACK.DESCRIPTION.HAS-OPEN-REPLIES'
            );
            content += '\n\n';
            for (const session of currentTurnsForUser) {
                content += `**${session.currentTurn.name}** in <#${
                    session.channelId
                }> (since <t:${moment(session.lastTurnAdvance).unix()}:D>)\n`;
            }
        }

        const embed = await this.embedProvider.get(EmbedType.Detailed, EmbedLevel.Info, {
            authorIcon: hiatus.member?.user?.avatarURL(),
            authorName: await this.userService.getEscapedDisplayName(hiatus.member),
            title: title,
            content: content,
            footer: hasOverdueReply
                ? await this.stringProvider.get('JOB.WELCOME-BACK.FOOTER.OVERDUE')
                : '',
        });

        // Send welcome back message
        this.logger.debug(`Getting reminder channel information...`);
        const reminderChannel = this.channelService.getTextChannelByChannelId(
            await this.configuration.getString('Channels_NotificationChannelId')
        );

        this.logger.debug(
            `Sending welcome back message for user ${hiatus.member?.user?.username}...`
        );
        try {
            await reminderChannel.send({
                content: `${hiatus.member}`,
                embeds: [embed],
            });
        } catch (error) {
            this.logger.error('Cannot send welcome back message.', this.logger.prettyError(error));
            return false;
        }

        return true;
    }

    // endregion

    // region HIATUS STATUS
    /**
     * Gets a hiatus status string according to whether the user has a hiatus or not
     *
     * @param userId the userid of the user to check
     * @param detailed whether or not the information returned should be detailed or not
     * @returns a hiatus status string
     */
    public async getUserHiatusStatus(userId: string, detailed = false): Promise<string> {
        const hiatus = await HiatusModel.findOne({ userId: userId }).exec();
        if (!hiatus) return HiatusStatus.NoHiatus;
        if (hiatus.expires) {
            if (!detailed) return HiatusStatus.ActiveHiatus;
            return HiatusStatus.ActiveHiatus + `(returns <t:${moment(hiatus.expires).unix()}:R>)`;
        }
        return HiatusStatus.ActiveIndefiniteHiatus;
    }

    /**
     * Checks if user has an active hiatus
     *
     * @param userId the user id of the user to check
     * @returns true if hiatus exists, false otherwise
     */
    public async userHasActiveHiatus(userId: string): Promise<boolean> {
        const hiatus = await HiatusModel.findOne({ userId: userId }).exec();
        return hiatus != null;
    }

    // endregion
}
