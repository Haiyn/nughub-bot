import { Command } from '@commands/command';
import { CommandError } from '@models/commands/command-error';
import { CommandResult } from '@models/commands/command-result';
import { ICharacterSchema } from '@models/data/character-schema';
import { ISessionSchema, SessionModel } from '@models/data/session-schema';
import { PermissionLevel } from '@models/permissions/permission-level';
import { EmbedLevel } from '@models/ui/embed-level';
import { EmbedType } from '@models/ui/embed-type';
import { CommandValidationError } from '@src/models/commands/command-validation-error';
import {
    CommandInteraction,
    CommandInteractionOptionResolver,
    Message,
    TextChannel,
} from 'discord.js';
import { injectable } from 'inversify';

@injectable()
export class SessionNext extends Command {
    public permissionLevel: PermissionLevel = PermissionLevel.Member;

    async run(interaction: CommandInteraction): Promise<CommandResult> {
        this.logger.debug('Resolving channel...');
        let channel;
        if (!interaction.options.getChannel('channel')) {
            // No channel option was supplied, check the current channel
            await this.validateCurrentChannel(interaction.channelId);
            channel = interaction.channel;
        } else {
            // Channel option was supplied, use it
            channel = interaction.options.getChannel('channel');
        }

        const session: ISessionSchema = await SessionModel.findOne({ channelId: channel.id });
        const userMessage: string = interaction.options.getString('message');

        this.logger.debug('Validating user turn...');
        await this.validateUserTurn(session.currentTurn.userId, interaction.member.user.id);

        this.logger.debug('Updating user turn in database...');
        const newSession: ISessionSchema = await this.updateTurnOderInDatabase(session);

        this.logger.debug('Updating user turn in sessions channel...');
        await this.updateTurnOrderInSessionsChannel(newSession);

        this.logger.debug('Notifying next user...');
        await this.notifyNextUser(session.currentTurn, newSession, userMessage);

        const embedReply = await this.embedProvider.get(EmbedType.Minimal, EmbedLevel.Success, {
            content: await this.stringProvider.get('COMMAND.SESSION-NEXT.SUCCESS'),
        });
        await this.interactionService.reply(interaction, {
            embeds: [embedReply],
        });

        return {
            executed: true,
            message: `Successfully advanced turn for RP in channel ID ${channel.id}`,
        };
    }

    public async validateOptions(options: CommandInteractionOptionResolver): Promise<void> {
        const channel = options.getChannel('channel');
        if (!channel) return Promise.resolve(); // It is valid to provide no channel, the interaction channel will be checked instead
        const foundSession = await SessionModel.findOne({
            channelId: channel.id,
        }).exec();
        if (!foundSession) {
            throw new CommandValidationError(
                `User provided channel that has no ongoing RP.`,
                await this.stringProvider.get('COMMAND.SESSION-NEXT.VALIDATION.NO-ONGOING-RP', [
                    channel.id,
                ])
            );
        }
    }

    /**
     * Validates that it is currently the command creator's turn
     *
     * @param currentTurnId The User ID of the user that is currently next
     * @param interactionCreatorId The User ID of the user that issued the command
     * @returns Resolves if valid
     * @throws {CommandValidationError} Throws if it's not their turn
     */
    private async validateUserTurn(
        currentTurnId: string,
        interactionCreatorId: string
    ): Promise<void> {
        if (currentTurnId != interactionCreatorId) {
            throw new CommandValidationError(
                "User tried to advance RP but it's not their turn",
                await this.stringProvider.get('COMMAND.SESSION-NEXT.VALIDATION.NOT-USERS-TURN', [
                    currentTurnId,
                ])
            );
        }
    }

    /**
     * Validates the channel where the command was used because no channel was passe in the options
     *
     * @param currentChannelId The ID of the channel where the command was used
     * @returns Resolves if there's an RP in this channel
     * @throws {CommandValidationError} Throws is there is no RP in this channel
     */
    private async validateCurrentChannel(currentChannelId: string): Promise<void> {
        const result = await SessionModel.findOne({ channelId: currentChannelId });
        if (!result)
            throw new CommandValidationError(
                'User tried to use next command without parameter in an channel that has no ongoing session',
                await this.stringProvider.get(
                    'COMMAND.SESSION-NEXT.VALIDATION.NO-ONGOING-RP-IN-CURRENT-CHANNEL'
                )
            );
    }

    /**
     * Iterates the turn and saves the new current turn to the session in the database
     *
     * @param session The current session before the iterate turn
     * @returns The new session after the update
     * @throws {CommandError} Throws if saving to mongodb failed
     */
    private async updateTurnOderInDatabase(session: ISessionSchema): Promise<ISessionSchema> {
        const nextTurn: ICharacterSchema = this.iterateTurn(session.turnOrder, session.currentTurn);

        this.logger.trace(
            `Current session: ${JSON.stringify(session)}\nNext currentTurn will be: ${
                nextTurn.userId
            } - ${nextTurn.name}`
        );
        const newSession: ISessionSchema = await SessionModel.findOneAndUpdate(
            { channelId: session.channelId },
            { currentTurn: nextTurn },
            { new: true }
        ).catch(async (error) => {
            throw new CommandError(
                `Could not update session for channel ID ${session.channelId}`,
                await this.stringProvider.get('SYSTEM.ERROR.INTERNAL.MONGOOSE-REJECT'),
                error
            );
        });
        this.logger.trace(
            `Updated next user for session: ${JSON.stringify(newSession.currentTurn)}`
        );
        return newSession;
    }

    /**
     * Updates the current turn indicator in the current sessions channel
     *
     * @param session The new session with the new current turn
     * @returns Resolves when sent
     * @throws {CommandError} Throws if the message could not be edited
     */
    private async updateTurnOrderInSessionsChannel(session: ISessionSchema): Promise<void> {
        const currentSessionsChannelId = await this.configuration.getString(
            'Channels_CurrentSessionsChannelId'
        );
        try {
            let postContent = `\n\n<#${session.channelId}>:\n\n`;
            session.turnOrder.forEach((character) => {
                if (
                    character.userId === session.currentTurn.userId &&
                    character.name === session.currentTurn.name
                )
                    postContent += ':arrow_right: ';
                postContent += `${character.name} <@${character.userId}>\n`;
            });
            const divider = await this.embedProvider.get(EmbedType.Separator, EmbedLevel.Info, {
                content: await this.stringProvider.get('SYSTEM.DECORATORS.SEPARATOR'),
            });

            const sessionPost: Message = this.channelService
                .getTextChannelByChannelId(currentSessionsChannelId)
                .messages.cache.get(session.sessionPostId);
            await sessionPost.edit({
                content: postContent,
                embeds: [divider],
                allowedMentions: { parse: [] },
            });
        } catch (error) {
            throw new CommandError(
                'Failed to update session post with new current turn marker',
                await this.stringProvider.get(
                    'COMMAND.SESSION-NEXT.ERROR.SESSION-POST-UPDATE-FAILED',
                    [currentSessionsChannelId]
                ),
                error
            );
        }
    }

    /**
     * Mentions the user that is next in the turn order
     *
     * @param previousTurn The user that previously had the turn
     * @param newSession The session after the turn order update
     * @param userMessage The message the previous user left
     * @returns Resolves when notification sent
     */
    private async notifyNextUser(
        previousTurn: ICharacterSchema,
        newSession: ISessionSchema,
        userMessage?: string
    ): Promise<void> {
        let content = `*${newSession.currentTurn.name}* in <#${newSession.channelId}>`;
        if (userMessage) content += `\n\n<@${previousTurn.userId}> said: \\"${userMessage}\\"`;
        const user = await this.client.users.fetch(newSession.currentTurn.userId);
        const embed = await this.embedProvider.get(EmbedType.Detailed, EmbedLevel.Info, {
            title: "It's your turn!",
            content: content,
            authorName: user.username,
            authorIcon: user.avatarURL(),
        });
        const ping = `<@${newSession.currentTurn.userId}>`;
        const notificationChannel: TextChannel =
            await this.channelService.getTextChannelByChannelId(
                await this.configuration.getString('Channels_NotificationChannelId')
            );
        await notificationChannel.send({
            content: ping,
            embeds: [embed],
            allowedMentions: { users: [newSession.currentTurn.userId] },
        });

        this.logger.debug(
            `Notified next user (ID: ${newSession.currentTurn.userId}) in notification channel.`
        );
    }

    /**
     * Takes a turn order and current turn and finds person that is next
     *
     * @param turnOrder The turn oder
     * @param currentTurn The user that currently has the turn
     * @returns The user that is next
     */
    private iterateTurn(
        turnOrder: Array<ICharacterSchema>,
        currentTurn: ICharacterSchema
    ): ICharacterSchema {
        let nextTurn: ICharacterSchema = null;
        let index = 0;

        turnOrder.forEach((character) => {
            if (character.userId === currentTurn.userId && character.name === currentTurn.name) {
                if (index == turnOrder.length - 1) {
                    // If current turn is the last element, next turn is the first element
                    nextTurn = turnOrder[0];
                    return;
                }
                index++;
                nextTurn = turnOrder[index];
                return;
            }
            index++;
        });
        return nextTurn;
    }
}
