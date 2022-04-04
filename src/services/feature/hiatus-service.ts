import { FeatureService } from '@services/feature/feature-service';
import { EmbedLevel, EmbedType, Hiatus, HiatusModel, HiatusStatus } from '@src/models';
import { Message, TextChannel } from 'discord.js';
import { injectable } from 'inversify';
import moment = require('moment');

/** Handles different functions for hiatuses */
@injectable()
export class HiatusService extends FeatureService {
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
}
