import { FeatureService } from '@services/feature/feature-service';
import { ConfigurationKeys, HiatusModel, ISessionSchema } from '@src/models';
import { Message } from 'discord.js';
import { injectable } from 'inversify';

/** Handles different functions for session posts */
@injectable()
export class SessionService extends FeatureService {
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
}
