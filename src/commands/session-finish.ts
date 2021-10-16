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
                content:
                    'Uh-oh, something went wrong while I tried to remove the session internally.',
            });
            return Promise.resolve(
                new CommandResult(this, context, false, 'Failed to delete session from database')
            );
        }

        if (!(await this.deleteSessionFromSessionsChannel(parsedSession))) {
            await this.messageService.reply(context.originalMessage, {
                content: `I couldn't delete the session post from <#${parsedSession.channelId}> but the session is still finished! Please check if the session message was removed.`,
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
            content: `The session in <#${parsedSession.channelId}> is now finished!`,
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
            return Promise.resolve('Please provide all needed arguments!\n' + this.usageHint);

        const channelId = args.length == 0 ? context.originalMessage.channel.id : args[0];
        if (!this.helperService.isDiscordId(channelId)) {
            this.logger.info(
                `Message ID ${context.originalMessage.id}: User provided channel parameter that is not a discord channel.`
            );
            return Promise.resolve(
                "The channel you've given is not valid! Please make sure to either link it with a hashtag (#) or use this command in the RP channel you want to finish."
            );
        }
        const channel = this.channelService.getTextChannelByChannelId(channelId);
        if (!channel) {
            this.logger.info(
                `Message ID ${context.originalMessage.id}: User provided invalid channel.`
            );
            return Promise.resolve(
                "The channel you've given is not valid! Please make sure to either link it with a hashtag (#) or use this command in the RP channel you want to finish."
            );
        }
        const foundSession: ISessionSchema = await SessionModel.findOne({
            channelId: channel.id,
        }).exec();
        if (!foundSession) {
            this.logger.info(
                `Message ID ${context.originalMessage.id}: User provided channel without an active RP.`
            );
            return Promise.resolve(`There is no ongoing RP session in <#${channel.id}>!`);
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
