import { IConfiguration } from '@models/configuration';
import { ChannelService } from '@services/channel-service';
import { Service } from '@services/service';
import { TYPES } from '@src/types';
import { Client, Message, MessageOptions } from 'discord.js';
import { inject, injectable } from 'inversify';
import { Logger } from 'tslog';

/** Handles different functions in relation to the Discord Message objects */
@injectable()
export class MessageService extends Service {
    /** The channel service. Since messages are in channels, this is needed */
    readonly channelService: ChannelService;

    constructor(
        @inject(TYPES.Client) client: Client,
        @inject(TYPES.CommandLogger) logger: Logger,
        @inject(TYPES.Configuration) configuration: IConfiguration,
        @inject(TYPES.ChannelService) channelService: ChannelService
    ) {
        super(client, logger, configuration);
        this.channelService = channelService;
    }

    /**
     * Replies to a message with auto-deletion function if message is in an RP channel
     *
     * @param message The message to reply to
     * @param options The Message options that should be attached to the reply
     * @param autoDeleteInRpChannel whether or not the auto-delete should be used
     * @returns Resolves when finished
     */
    public async reply(
        message: Message,
        options: MessageOptions,
        autoDeleteInRpChannel = true
    ): Promise<void> {
        try {
            const response = await message.reply(options);
            if (autoDeleteInRpChannel) {
                const isRpChannel = this.channelService.isRpChannel(message.channel.id);
                if (isRpChannel) await this.deleteMessages([message, response], 10000);
            }
            return Promise.resolve();
        } catch (error) {
            this.logger.error(
                `Failed to auto delete reply messages: `,
                this.logger.prettyError(error)
            );
            return Promise.resolve();
        }
    }

    /**
     * Deletes the passed messages with an optional timeout
     *
     * @param messagesToDelete The messages to delete
     * @param timeout Optional timeout in ms
     * @returns Whether or not the messages were deleted
     */
    public async deleteMessages(messagesToDelete: Message[], timeout?: number): Promise<boolean> {
        try {
            setTimeout(
                () => {
                    messagesToDelete.forEach((message) => {
                        message.delete();
                    });
                },
                timeout ? timeout : 0
            );
            return Promise.resolve(true);
        } catch (error) {
            this.logger.error('Failed to delete messages: ', this.logger.prettyError(error));
            return Promise.resolve(false);
        }
    }
}
