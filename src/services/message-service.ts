import { IConfiguration } from '@models/configuration';
import { ChannelService } from '@services/channel-service';
import { Service } from '@services/service';
import { TYPES } from '@src/types';
import { Client, Message, MessageOptions } from 'discord.js';
import { inject, injectable } from 'inversify';
import { Logger } from 'tslog';

@injectable()
export class MessageService extends Service {
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
    public isBotMessage(message: Message): boolean {
        const isBot = message.author.bot;
        isBot ? this.logger.trace(`Message ID ${message.id}: is a bot message.`) : '';
        return isBot;
    }

    public isPrefixedMessage(message: Message): boolean {
        const isPrefixed = message.content.startsWith(this.configuration.guild.prefix);
        this.logger.trace(`Message ID ${message.id}: is ${isPrefixed ? '' : 'not'} prefixed.`);
        return isPrefixed;
    }

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
