import { Controller } from '@controllers/controller';
import { CanonCharacterModel, CanonCharacterSchema } from '@models/data/canon-character-schema';
import { CanonCharacterAvailability } from '@models/misc/canon-character-availability.enum';
import { DragonAgeGame } from '@models/misc/dragon-age-game.enum';
import { MessageService } from '@services/message-service';
import { ScheduleService } from '@services/schedule-service';
import { DragonAgeGameMapper } from '@src/mappers/dragon-age-game.mapper';
import { ConfigurationKeys } from '@src/models';
import { ConfigurationProvider, EmbedProvider, PermissionProvider } from '@src/providers';
import { ChannelService, UserService } from '@src/services';
import { TYPES } from '@src/types';
import { Client, Collection, Message, TextChannel } from 'discord.js';
import { inject, injectable } from 'inversify';
import { Logger } from 'tslog';

@injectable()
export class CharacterChannelController extends Controller {
    private readonly channelService: ChannelService;
    private readonly scheduleService: ScheduleService;
    private readonly messageService: MessageService;
    private readonly userService: UserService;

    constructor(
        @inject(TYPES.ChannelService) channelService: ChannelService,
        @inject(TYPES.ScheduleService) scheduleService: ScheduleService,
        @inject(TYPES.MessageService) messageService: MessageService,
        @inject(TYPES.UserService) userService: UserService,
        @inject(TYPES.BaseLogger) logger: Logger,
        @inject(TYPES.Client) client: Client,
        @inject(TYPES.GuildId) guildId: string,
        @inject(TYPES.Token) token: string,
        @inject(TYPES.ConfigurationProvider) configuration: ConfigurationProvider,
        @inject(TYPES.EmbedProvider) embedProvider: EmbedProvider,
        @inject(TYPES.PermissionProvider) permissionProvider: PermissionProvider
    ) {
        super(logger, guildId, token, client, configuration, embedProvider, permissionProvider);
        this.channelService = channelService;
        this.scheduleService = scheduleService;
        this.messageService = messageService;
        this.userService = userService;
    }

    /**
     * Schedules a qotd at the next possible time
     *
     * @returns when done
     */
    public async initializeCharacterChannels(): Promise<void> {
        await this.initializeCanonCharacterChannel();

        // await this.initializeOriginalCharacterChannel();
    }

    private async initializeCanonCharacterChannel(): Promise<void> {
        const channelId = await this.configuration.getString(
            ConfigurationKeys.Channels_CanonCharacterChannelId
        );
        const channel = await this.channelService.getTextChannelByChannelId(channelId);

        const messages: Collection<string, Message> = await channel.messages.fetch();
        let daoMessage = this.findCharacterListForGame(messages, DragonAgeGame.DAO);
        let da2Message = this.findCharacterListForGame(messages, DragonAgeGame.DA2);
        let daiMessage = this.findCharacterListForGame(messages, DragonAgeGame.DAI);
        if (!daoMessage || !da2Message || !daiMessage) {
            // Clear the channel of the other bot messages
            this.logger.debug(
                `At least one canon character list does not exist anymore. Clearing channel...`
            );
            await this.clearChannelOfBotMessages(channel);

            // get the new messages
            this.logger.debug(`Sending new messages...`);
            daoMessage = await this.sendCanonCharacterListForGame(channel, DragonAgeGame.DAO);
            da2Message = await this.sendCanonCharacterListForGame(channel, DragonAgeGame.DA2);
            daiMessage = await this.sendCanonCharacterListForGame(channel, DragonAgeGame.DAI);
        }

        await this.configuration.setString(ConfigurationKeys.Messages_CanonList_0, daoMessage.id);
        await this.configuration.setString(ConfigurationKeys.Messages_CanonList_1, da2Message.id);
        await this.configuration.setString(ConfigurationKeys.Messages_CanonList_2, daiMessage.id);
    }

    private findCharacterListForGame(
        messages: Collection<string, Message>,
        game: DragonAgeGame
    ): Message | undefined {
        return messages.find(
            (m) =>
                m.author.id === this.client.user.id &&
                m.content.includes(DragonAgeGameMapper.mapEnumToStringName(game).toUpperCase())
        );
    }

    private async clearChannelOfBotMessages(channel: TextChannel): Promise<void> {
        const messages: Collection<string, Message> = await channel.messages.fetch();

        for (const message of messages.values()) {
            if (message.author.id === this.client.user.id) {
                try {
                    await message.delete();
                } catch (error) {
                    this.logger.warn(
                        `Could not delete bot message ${message.id} in canon character list channel!`
                    );
                }
            }
        }
    }

    public async generateCanonCharacterListContentForGame(game: DragonAgeGame): Promise<string> {
        const canonCharacters: CanonCharacterSchema[] = await CanonCharacterModel.find({
            game: game,
        }).exec();

        let messageContent = `**${DragonAgeGameMapper.mapEnumToStringName(
            game
        )}**\n\n`.toUpperCase();
        for (const character of canonCharacters) {
            messageContent += `${character.name}: `;
            if (character.claimerId) {
                messageContent += `<@${character.claimerId}>`;
                if (character.availability === CanonCharacterAvailability.TemporaryClaim) {
                    messageContent += ` **(temporary claim)**`;
                }
            } else {
                messageContent += `**available**`;
            }
            messageContent += `\n`;
        }

        if (messageContent.length > 4096) {
            throw new Error(`New canon character list content exceeds the discord limit.`);
        }

        return messageContent;
    }

    private async sendCanonCharacterListForGame(
        channel: TextChannel,
        game: DragonAgeGame
    ): Promise<Message> {
        const messageContent = await this.generateCanonCharacterListContentForGame(game);
        return await channel.send({ content: messageContent, allowedMentions: { parse: [] } });
    }

    public async updateCanonCharacterList(game: DragonAgeGame): Promise<void> {
        this.logger.debug(`Updating canon character list for ${game[game]}...`);
        const canonCharacterChannelId = await this.configuration.getString(
            ConfigurationKeys.Channels_CanonCharacterChannelId
        );
        const listMessageId = await this.configuration.getString(
            ConfigurationKeys['Messages_CanonList_' + game]
        );
        const listMessage = await this.messageService.getMessageFromChannel(
            listMessageId,
            canonCharacterChannelId
        );
        if (!listMessage) {
            throw Error(
                `Could not get canon character list message with ID ${listMessageId} in channel with ID ${canonCharacterChannelId}`
            );
        }
        const messageContent = await this.generateCanonCharacterListContentForGame(game);

        try {
            await listMessage.edit({ content: messageContent, allowedMentions: { parse: [] } });
        } catch (error) {
            throw new Error(`Failed to edit canon character list with ID ${listMessageId}`);
        }
    }
}
