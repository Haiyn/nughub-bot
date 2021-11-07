import { Command } from '@commands/command';
import { CommandError } from '@models/commands/command-error';
import { CommandResult } from '@models/commands/command-result';
import { CommandValidationError } from '@models/commands/command-validation-error';
import { ISessionSchema, SessionModel } from '@models/data/session-schema';
import { CommandInteraction, CommandInteractionOptionResolver, TextChannel } from 'discord.js';
import { injectable } from 'inversify';

@injectable()
export class SessionFinish extends Command {
    async run(interaction: CommandInteraction): Promise<CommandResult> {
        const channel = this.channelService.getTextChannelByChannelId(
            interaction.options.getChannel('channel').id
        );
        const sessionChannel = this.channelService.getTextChannelByChannelId(
            await this.configuration.getString('Channels_CurrentSessionsChannelId')
        );
        const session: ISessionSchema = await this.getSessionFromDatabase(channel.id);

        await this.deleteSessionFromDatabase(channel.id);

        await this.deleteSessionPostFromSessionsChannel(sessionChannel, session.sessionPostId);

        await this.sendSeparatorInRpChannel(channel);

        await interaction.reply({
            content: await this.stringProvider.get('COMMAND.SESSION-FINISH.SUCCESS.POST-DELETED', [
                channel.id,
            ]),
        });
        return {
            executed: true,
            message: await this.stringProvider.get('COMMAND.SESSION-FINISH.SUCCESS.POST-DELETED'),
        };
    }

    public async validateOptions(options: CommandInteractionOptionResolver): Promise<void> {
        const channel = this.channelService.getTextChannelByChannelId(
            options.getChannel('channel').id
        );

        if (!(await SessionModel.findOne({ channelId: channel.id }).exec())) {
            throw new CommandValidationError(
                `User provided a channel that has no active RP.`,
                await this.stringProvider.get('COMMAND.SESSION-FINISH.VALIDATION.NO-ONGOING-RP', [
                    channel.id,
                ])
            );
        }
    }

    /**
     * Gets the session for the provided channel from th database
     *
     * @param channelId The channelId provided by the command option
     * @returns The session
     * @throws {CommandError} When the fetching fails
     */
    private async getSessionFromDatabase(channelId: string): Promise<ISessionSchema> {
        return await SessionModel.findOne({ channelId: channelId }).catch(async (error) => {
            throw new CommandError(
                `Could not get session from database for channel ID ${channelId}`,
                await this.stringProvider.get('SYSTEM.ERROR.INTERNAL.MONGOOSE-REJECT'),
                error
            );
        });
    }

    /**
     * Deletes the session from the database
     *
     * @param channelId The channelId provided by the command option
     * @returns Resolves when deleted
     * @throws {CommandError} When the fetching fails
     */
    private async deleteSessionFromDatabase(channelId: string): Promise<void> {
        await SessionModel.findOneAndDelete({ channelId: channelId }).catch(async (error) => {
            throw new CommandError(
                `Could not delete session from database for channel ID ${channelId}`,
                await this.stringProvider.get('SYSTEM.ERROR.INTERNAL.MONGOOSE-REJECT'),
                error
            );
        });
    }

    /**
     * Deletes the discord message from the sessions channel
     *
     * @param channel The sessions channel
     * @param messageId The ID of the message to delete
     * @returns Resolves when deleted
     */
    private async deleteSessionPostFromSessionsChannel(
        channel: TextChannel,
        messageId: string
    ): Promise<void> {
        await channel.messages
            .delete(messageId)
            .then(() => {
                this.logger.debug(`Deleted session post with message ID ${messageId}`);
            })
            .catch((error) => {
                this.logger.warn(
                    `Could not delete session post with id ${messageId}`,
                    this.logger.prettyError(error)
                );
            });
    }

    /**
     * Sends a separator message in the RP channel where the session was finished
     *
     * @param channel The channel in which to send the message
     * @returns Resolves when sent
     */
    private async sendSeparatorInRpChannel(channel: TextChannel): Promise<void> {
        await channel
            .send({
                content: await this.stringProvider.get('SYSTEM.DECORATORS.SEPARATOR'),
            })
            .catch((error) => {
                this.logger.warn(
                    `Could not send separator in RP channel (ID: ${channel.id}):`,
                    this.logger.prettyError(error)
                );
            });
    }
}
