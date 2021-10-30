import { Command } from '@commands/command';
import { CommandContext } from '@models/command-context';
import { injectable } from 'inversify';
import { CommandResult } from '@models/command-result';
import { SessionModel, ISessionSchema } from '@models/session-schema';

@injectable()
export class SessionFinish extends Command {
    names = ['finish'];
    description = 'Finishes an ongoing RP. All users stop receiving notifications and reminders.';
    usageHint = '**Usage Hint:** `' + `${this.names[0]} [#<channel name>]\``;
    permissionLevel = 1;

    async run(context: CommandContext): Promise<CommandResult> {
        this.logger.debug('Parsing arguments for finish command...');
        let parsedSession: ISessionSchema | string = await this.validateArguments(
            context.args,
            context
        );
        if (typeof parsedSession === 'string') {
            await this.messageService.reply(context.originalMessage, {
                content: parsedSession,
            });
            return Promise.resolve(
                new CommandResult(this, context, false, 'Input validation failed.')
            );
        }
        if (!parsedSession) {
            parsedSession = await SessionModel.findOne({
                channelId: context.originalMessage.channel.id,
            });
        }

        if (!(await this.deleteSessionFromDatabase(parsedSession.channelId))) {
            await this.messageService.reply(context.originalMessage, {
                content: await this.stringProvider.get(
                    'COMMAND.SESSION-FINISH.ERROR.INTERNAL.DELETE-SESSION-DATABASE'
                ),
            });
            return Promise.resolve(
                new CommandResult(this, context, false, 'Failed to delete session from database')
            );
        }

        if (!(await this.deleteSessionFromSessionsChannel(parsedSession))) {
            await this.messageService.reply(context.originalMessage, {
                content: await this.stringProvider.get(
                    'COMMAND.SESSION-FINISH.SUCCESS.POST-NOT-DELETED',
                    [parsedSession.channelId]
                ),
            });
            return Promise.resolve(
                new CommandResult(
                    this,
                    context,
                    false,
                    `Failed to delete session from channel (ID: ${parsedSession.channelId})`
                )
            );
        }

        await this.messageService.reply(context.originalMessage, {
            content: await this.stringProvider.get('COMMAND.SESSION-FINISH.SUCCESS.POST-DELETED', [
                parsedSession.channelId,
            ]),
        });
        await this.channelService
            .getTextChannelByChannelId(parsedSession.channelId)
            .send('```⋟────────────────────────⋞```');
        return Promise.resolve(
            new CommandResult(
                this,
                context,
                true,
                `Deleted session for channel ID ${parsedSession.channelId}`
            )
        );
    }

    public async validateArguments(
        args: string[],
        context?: CommandContext
    ): Promise<ISessionSchema | string> {
        if (args.length > 1)
            return Promise.resolve(
                await this.stringProvider.get(
                    'STRINGS.COMMAND.SESSION-FINISH.ERROR.VALIDATION.INSUFFICIENT_ARGUMENT_LENGTH'
                )
            );

        const channelId = args.length == 0 ? context.originalMessage.channel.id : args[0];
        if (!this.helperService.isDiscordId(channelId)) {
            this.logger.info(
                `Message ID ${context.originalMessage.id}: User provided channel parameter that is not a discord channel.`
            );
            return Promise.resolve(
                await this.stringProvider.get(
                    'STRINGS.COMMAND.SESSION-FINISH.ERROR.VALIDATION.INVALID_CHANNEL'
                )
            );
        }
        const channel = this.channelService.getTextChannelByChannelId(channelId);
        if (!channel) {
            this.logger.info(
                `Message ID ${context.originalMessage.id}: User provided invalid channel.`
            );
            return Promise.resolve(
                await this.stringProvider.get(
                    'STRINGS.COMMAND.SESSION-FINISH.ERROR.VALIDATION.INVALID_CHANNEL'
                )
            );
        }
        const foundSession: ISessionSchema = await SessionModel.findOne({
            channelId: channel.id,
        }).exec();
        if (!foundSession) {
            this.logger.info(
                `Message ID ${context.originalMessage.id}: User provided channel without an active RP.`
            );
            return Promise.resolve(
                await this.stringProvider.get(
                    'STRINGS.COMMAND.SESSION-FINISH.ERROR.VALIDATION.NO_ONGOING_RP',
                    [channelId]
                )
            );
        }
        this.logger.trace(foundSession);

        return Promise.resolve(foundSession);
    }

    private async deleteSessionFromDatabase(channelId: string): Promise<boolean> {
        try {
            await SessionModel.findOneAndDelete({
                channelId: channelId,
            }).exec();
            this.logger.debug('Deleted one record from the database.');
            return Promise.resolve(true);
        } catch (error) {
            this.logger.error(
                `Could not delete session for channel ID ${channelId}:`,
                this.logger.prettyError(error)
            );
            return Promise.resolve(false);
        }
    }

    private async deleteSessionFromSessionsChannel(session: ISessionSchema): Promise<boolean> {
        try {
            const channel = await this.channelService.getTextChannelByChannelId(
                this.configuration.channels.currentSessionsChannelId
            );
            await channel.messages.delete(session.sessionPostId);
            this.logger.debug(
                `Deleted one message (ID: ${session.sessionPostId}) in session channel.`
            );
            return Promise.resolve(true);
        } catch (error) {
            this.logger.error(
                `Failed to delete Session with message ID ${session.sessionPostId}:`,
                this.logger.prettyError(error)
            );
            return Promise.resolve(false);
        }
    }
}
