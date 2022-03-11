import { Controller } from '@controllers/controller';
import { CanonCharacterModel, CanonCharacterSchema } from '@models/data/canon-character-schema';
import { CanonCharacterAvailability } from '@models/misc/canon-character-availability.enum';
import { DragonAgeGame } from '@models/misc/dragon-age-game.enum';
import { MessageService } from '@services/message-service';
import { ScheduleService } from '@services/schedule-service';
import { DragonAgeGameMapper } from '@src/mappers/dragon-age-game.mapper';
import { ConfigurationKeys, OriginalCharacterModel, OriginalCharacterSchema } from '@src/models';
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

        await this.initializeOriginalCharacterChannel();
    }

    // region HELPERS

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

    // endregion

    // region CANON CHARACTERS

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

    private async generateCanonCharacterListContentForGame(game: DragonAgeGame): Promise<string> {
        const canonCharacters: CanonCharacterSchema[] = await CanonCharacterModel.find({
            game: game,
        })
            .sort({ name: 1 })
            .exec();

        let messageContent = `__**${DragonAgeGameMapper.mapEnumToStringName(
            game
        )}**__\n\n`.toUpperCase();
        for (const character of canonCharacters) {
            messageContent += await this.getCanonCharacterEntry(character);
            messageContent += `\n`;
        }

        if (messageContent.length > 4096) {
            throw new Error(`New canon character list content exceeds the discord limit.`);
        }

        return messageContent;
    }

    public async getCanonCharacterEntry(character: CanonCharacterSchema): Promise<string> {
        let messageContent = `${character.name}: `;
        if (character.claimerId) {
            const claimer = await this.userService.getUserById(character.claimerId);
            messageContent += `${claimer.username} (${claimer})`;
            if (character.availability === CanonCharacterAvailability.TemporaryClaim) {
                messageContent += ` **(temporary claim)**`;
            }
        } else {
            messageContent += `**available**`;
        }

        return messageContent;
    }

    private async sendCanonCharacterListForGame(
        channel: TextChannel,
        game: DragonAgeGame
    ): Promise<Message> {
        const messageContent = await this.generateCanonCharacterListContentForGame(game);
        let message;
        try {
            message = await channel.send({
                content: messageContent,
                allowedMentions: { parse: [] },
            });
        } catch (error) {
            this.logger.error(
                `Could not send cc message for game ${game} in channel ${channel.name}`
            );
            throw new Error(error);
        }
        return message;
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
            try {
                await this.initializeCanonCharacterChannel();
            } catch (error) {
                this.logger.prettyError(error);
                throw Error(
                    `Could not get canon character list message with ID ${listMessageId} in channel with ID ${canonCharacterChannelId}`
                );
            }
        }
        const messageContent = await this.generateCanonCharacterListContentForGame(game);

        try {
            await listMessage.edit({ content: messageContent, allowedMentions: { parse: [] } });
        } catch (error) {
            throw new Error(`Failed to edit canon character list with ID ${listMessageId}`);
        }
    }

    // endregion

    // region ORIGINAL CHARACTERS

    private async initializeOriginalCharacterChannel(): Promise<void> {
        const channelId = await this.configuration.getString(
            ConfigurationKeys.Channels_OriginalCharacterChannelId
        );
        const channel = await this.channelService.getTextChannelByChannelId(channelId);

        const messages: Collection<string, Message> = await channel.messages.fetch();
        let daoMessage = this.findCharacterListForGame(messages, DragonAgeGame.DAO);
        let da2Message = this.findCharacterListForGame(messages, DragonAgeGame.DA2);
        let daiMessage = this.findCharacterListForGame(messages, DragonAgeGame.DAI);
        if (!daoMessage || !da2Message || !daiMessage) {
            // Clear the channel of the other bot messages
            this.logger.debug(
                `At least one original character list does not exist anymore. Clearing channel...`
            );
            await this.clearChannelOfBotMessages(channel);

            // get the new messages
            this.logger.debug(`Sending new messages...`);
            daoMessage = await this.sendOriginalCharacterListForGame(channel, DragonAgeGame.DAO);
            da2Message = await this.sendOriginalCharacterListForGame(channel, DragonAgeGame.DA2);
            daiMessage = await this.sendOriginalCharacterListForGame(channel, DragonAgeGame.DAI);
        }

        await this.configuration.setString(
            ConfigurationKeys.Messages_OriginalList_0,
            daoMessage.id
        );
        await this.configuration.setString(
            ConfigurationKeys.Messages_OriginalList_1,
            da2Message.id
        );
        await this.configuration.setString(
            ConfigurationKeys.Messages_OriginalList_2,
            daiMessage.id
        );
    }

    private async sendOriginalCharacterListForGame(
        channel: TextChannel,
        game: DragonAgeGame
    ): Promise<Message> {
        const messageContent = await this.generateOriginalCharacterListContentForGame(game);
        let message;
        try {
            message = await channel.send({
                content: messageContent,
                allowedMentions: { parse: [] },
            });
        } catch (error) {
            this.logger.error(
                `Could not send oc message for game ${game} in channel ${channel.name}`
            );
            throw new Error(error);
        }
        return message;
    }

    private async generateOriginalCharacterListContentForGame(
        game: DragonAgeGame
    ): Promise<string> {
        const originalCharacters: OriginalCharacterSchema[] = await OriginalCharacterModel.find({
            game: game,
        })
            .sort({ name: 1 })
            .exec();

        let messageContent = `__**${DragonAgeGameMapper.mapEnumToStringName(
            game
        )}**__\n\n`.toUpperCase();
        for (const character of originalCharacters) {
            const user = await this.userService.getUserById(character.userId);
            messageContent += `• **${character.name}** (${character.race}, ${character.age}) ${user.username} (${user})\n`;
        }

        if (messageContent.length > 4096) {
            throw new Error(`New canon character list content exceeds the discord limit.`);
        }

        return messageContent;
    }

    public async updateOriginalCharacterList(game: DragonAgeGame): Promise<void> {
        this.logger.debug(`Updating original character list for ${game[game]}...`);
        const originalCharacterChannelId = await this.configuration.getString(
            ConfigurationKeys.Channels_OriginalCharacterChannelId
        );
        const listMessageId = await this.configuration.getString(
            ConfigurationKeys['Messages_OriginalList_' + game]
        );
        const listMessage = await this.messageService.getMessageFromChannel(
            listMessageId,
            originalCharacterChannelId
        );
        if (!listMessage) {
            try {
                await this.initializeOriginalCharacterChannel();
            } catch (error) {
                this.logger.prettyError(error);
                throw Error(
                    `Could not get original character list message with ID ${listMessageId} in channel with ID ${originalCharacterChannelId}`
                );
            }
        }
        const messageContent = await this.generateOriginalCharacterListContentForGame(game);

        try {
            await listMessage.edit({ content: messageContent, allowedMentions: { parse: [] } });
        } catch (error) {
            throw new Error(`Failed to edit original character list with ID ${listMessageId}`);
        }
    }

    // endregion
}
