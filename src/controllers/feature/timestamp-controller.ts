import { FeatureController } from '@controllers/feature/feature-controller';
import { SessionFinish, SessionNext } from '@src/commands';
import container from '@src/inversify.config';
import {
    EmbedLevel,
    EmbedType,
    ISessionSchema,
    NextReason,
    SessionModel,
    TimestampActions,
} from '@src/models';
import { ButtonInteraction, TextChannel } from 'discord.js';
import { injectable } from 'inversify';

/** Controls the logic of timestamps */
@injectable()
export class TimestampController extends FeatureController {
    /**
     * Handles a button interaction on a timestamp post
     *
     * @param interaction The button interaction
     * @returns when done
     */
    public async handleTimestampInteraction(interaction: ButtonInteraction): Promise<void> {
        const action = interaction.customId.split(':')[1];
        const channelId = interaction.customId.split(':')[2];

        if (action === TimestampActions.NotifyUser) {
            this.logger.info(`Received notify request from timestamp interaction. Notifying...`);
            const session = await SessionModel.findOne({ channelId: channelId }).exec();

            if (!session) {
                this.logger.error(
                    `Could not find a session for channelId ${channelId} while trying to notify user on timestamp interaction.`
                );
                return;
            }

            const content = `*${session.currentTurn.name}* in <#${session.channelId}>`;
            const user = await this.client.users.fetch(session.currentTurn.userId);
            const embed = await this.embedProvider.get(EmbedType.Detailed, EmbedLevel.Info, {
                title: await this.stringProvider.get('COMMAND.SESSION-NEXT.NOTIFICATION-TITLE'),
                content: content,
                authorName: user.username,
                authorIcon: user.avatarURL(),
                footer: `You've been manually notified by a Moderator.`,
            });
            const ping = `${await this.userService.getUserById(session.currentTurn.userId)}`;
            const notificationChannel: TextChannel =
                await this.channelService.getTextChannelByChannelId(
                    await this.configuration.getString('Channels_NotificationChannelId')
                );
            await notificationChannel.send({
                content: ping,
                embeds: [embed],
                allowedMentions: { users: [session.currentTurn.userId] },
            });

            this.logger.debug(
                `Notified user (ID: ${session.currentTurn.userId}) in via timestamp.`
            );
        } else if (action === TimestampActions.AdvanceTurn) {
            this.logger.info(`Received skip request from timestamp interaction. Skipping...`);
            const command: SessionNext = container.get('Next');
            await command.runInternally(channelId, NextReason.Skipped);
        } else if (action === TimestampActions.Finish) {
            this.logger.info(`Received finish request from timestamp interaction. Finishing...`);
            const command: SessionFinish = container.get('Finish');
            const session: ISessionSchema = await SessionModel.findOne({
                channelId: channelId,
            }).exec();
            await command.runInternally(session, false);
        }

        await interaction.deferUpdate();
        this.logger.info(`Handled timestamp post interaction.`);
    }
}
