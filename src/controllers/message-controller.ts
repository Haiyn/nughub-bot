import { Message, TextChannel } from 'discord.js';
import { injectable } from 'inversify';
import { SessionModel } from '@models/session-schema';
import { Controller } from '@controllers/controller';

@injectable()
export class MessageController extends Controller {
    async handleMessage(message: Message): Promise<void> {
        if (
            this.messageService.isBotMessage(message) ||
            !this.messageService.isPrefixedMessage(message)
        ) {
            this.logger.debug(`Message ID ${message.id}: Skipping.`);
            return;
        }

        const commandContext = this.commandService.getCommandContextFromMessage(message);

        if (!commandContext) {
            this.logger.debug(
                `Message ID ${message.id}: Could not match command "${message.content.substr(
                    1,
                    message.content.indexOf(' ')
                )}".`
            );
            const response = await message.reply("I don't recognize that command. Try !help.");
            if (this.channelService.isRpChannel(message.channel.id))
                await this.messageService.deleteMessages([message, response], 10000);
            return;
        }

        this.logger.info(
            `Message ID ${commandContext.originalMessage.id}: User issued command \"${commandContext.command.names[0]}\".`
        );
        if (
            !this.permissionService.hasPermission(
                commandContext.originalMessage.member,
                commandContext.command.permissionLevel
            )
        ) {
            this.logger
                .info(`Message ID ${message.id}: User is not authorized for command "${commandContext.command.names[0]}".
                User ID: ${commandContext.originalMessage.author.id}
                User roles: ${commandContext.originalMessage.member.roles}`);
            const response = await message.reply(
                "You aren't allowed to use that command. Try !help."
            );
            if (this.channelService.isRpChannel(message.channel.id))
                await this.messageService.deleteMessages([message, response], 10000);
            return;
        }

        await commandContext.command
            .run(commandContext)
            .then((result) => {
                result.success
                    ? this.logger.info(
                          `Message ID ${message.id}: Successfully ran command "${result.command.names[0]}": ${result.message}`
                      )
                    : this.logger.info(
                          `Message ID ${message.id}: Did not run command "${result.command.names[0]}": ${result.message}`
                      );
                return;
            })
            .catch((result) => {
                this.logger.error(
                    `Message ID ${message.id}: Could not run command "${commandContext.command.names[0]}": ${result.message}`,
                    result.error ? this.logger.prettyError(result.error) : null
                );
                return;
            });
    }

    async handleDeletion(message: Message): Promise<void> {
        if (message.author.id == this.client.user.id) {
            const foundSessionPost = await SessionModel.findOne({
                sessionPostId: message.id,
            }).exec();
            if (!foundSessionPost) {
                this.logger.debug('Deleted bot message is not a session post.');
                return;
            }
            try {
                this.logger.debug('Session message was deleted. Removing session from database...');
                await SessionModel.findOneAndDelete({ sessionPostId: message.id }).exec();
                const internalChannel: TextChannel =
                    await this.channelService.getTextChannelByChannelId(
                        this.configuration.channels.internalChannelId
                    );
                await this.channelService
                    .getTextChannelByChannelId(foundSessionPost.channelId)
                    .send('```⋟────────────────────────⋞```');
                await internalChannel.send(
                    `The session post for the session in <#${foundSessionPost.channelId}> was deleted. I have finished the session for you.`
                );
                this.logger.debug('Removed session from database.');
                return;
            } catch (error) {
                this.logger.error(
                    `Failed to finish deleted session for channel ID ${foundSessionPost.channelId}.`
                );
                return;
            }
        } else {
            this.logger.debug(
                `Deleted message is not a bot message from the client (Author ID: ${message.author.id}, Client ID: ${this.client.user.id}).`
            );
            return;
        }
    }

    async handleCaching(): Promise<void> {
        const currentSessionsChannel = this.channelService.getTextChannelByChannelId(
            this.configuration.channels.currentSessionsChannelId
        );
        await currentSessionsChannel.messages.fetch().then((fetchedMessages) => {
            this.logger.debug(
                `Fetched ${fetchedMessages.size} messages from currentSessionsChannel.`
            );
        });

        this.logger.debug('Fetching done.');
        return;
    }
}
