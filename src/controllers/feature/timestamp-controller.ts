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
        const action = interaction.customId.split(':')[1] as TimestampActions;
        const channelId = interaction.customId.split(':')[2];

        switch (action) {
            case TimestampActions.NotifyUser:
                await this.handleNotifyUserAction(channelId);
                break;
            case TimestampActions.AdvanceTurn:
                await this.handleAdvanceTurnAction(channelId);
                break;
            case TimestampActions.Finish:
                await this.handleFinishAction(channelId);
                break;
            default:
                this.logger.error(`No handler for timestamp action ${action}!`);
        }

        await interaction.deferUpdate();
        this.logger.info(`Handled timestamp post interaction.`);
    }

    private async handleFinishAction(channelId: string): Promise<void> {
        this.logger.info(`Received finish request from timestamp interaction. Finishing...`);
        const command: SessionFinish = container.get('Finish');
        const session: ISessionSchema = await SessionModel.findOne({
            channelId: channelId,
        }).exec();
        await command.runInternally(session, false);
    }

    private async handleAdvanceTurnAction(channelId: string): Promise<void> {
        this.logger.info(`Received skip request from timestamp interaction. Skipping...`);
        const command: SessionNext = container.get('Next');
        await command.runInternally(channelId, NextReason.Skipped);
    }

    private async handleNotifyUserAction(channelId: string): Promise<void> {
        this.logger.info(`Received notify request from timestamp interaction. Notifying...`);
        const session = await SessionModel.findOne({ channelId: channelId }).exec();

        if (!session) {
            this.logger.error(
                `Could not find a session for channelId ${channelId} while trying to notify user on timestamp interaction.`
            );
            return;
        }

        let content = `*${session.currentTurn.name}* in <#${session.channelId}>`;
        if (session.isMainQuest)
            content += `\n\n ⭐ **This is a main quest. Make sure to reply timely to keep the quest going!**`;

        const user = await this.client.users.fetch(session.currentTurn.userId);
        const embed = await this.embedProvider.get(EmbedType.Detailed, EmbedLevel.Info, {
            title: await this.stringProvider.get('COMMAND.SESSION-NEXT.NOTIFICATION-TITLE'),
            content: content,
            authorName: user.username,
            authorIcon: user.avatarURL(),
            footer: `You've been manually notified by a Moderator.`,
        });
        const ping = `${await this.userService.getGuildMemberById(session.currentTurn.userId)}`;
        const notificationChannel: TextChannel =
            await this.channelService.getTextChannelByChannelId(
                await this.configuration.getString('Channels_NotificationChannelId')
            );
        await notificationChannel.send({
            content: ping,
            embeds: [embed],
            allowedMentions: { users: [session.currentTurn.userId] },
        });

        this.logger.info(`Notified user (ID: ${session.currentTurn.userId}) in via timestamp.`);
    }
}
