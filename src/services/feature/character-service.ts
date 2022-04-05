import { CanonCharacterAvailability } from '@models/misc/canon-character-availability.enum';
import { CharacterListType } from '@models/misc/character-list-type.enum';
import { DragonAgeGame } from '@models/misc/dragon-age-game.enum';
import { FeatureService } from '@services/feature/feature-service';
import { DragonAgeGameMapper } from '@src/mappers';
import {
    CanonCharacter,
    CanonCharacterModel,
    CommandError,
    EmbedLevel,
    EmbedType,
    OriginalCharacter,
    OriginalCharacterModel,
} from '@src/models';
import { Collection, Message, MessageEmbed, TextChannel } from 'discord.js';
import { injectable } from 'inversify';

/** Handles different functions for character lists */
@injectable()
export class CharacterService extends FeatureService {
    // region PUBLIC

    /**
     * Initializes the character lists in one channel corresponding to the CharacterListType
     *
     * @param listType the character list type (original, canon, pairing,...) that should be initialized
     */
    public async initializeCharacterLists(listType: CharacterListType): Promise<void> {
        this.logger.debug(`Initializing character lists for list type ${listType}...`);
        const channelId = await this.configuration.getString(
            'Channels_CharacterListChannelId_' + listType
        );
        const channel = await this.channelService.getTextChannelByChannelId(channelId);
        this.logger.debug(`Initializing in channel ${channel.name}.`);

        let valid = true;

        for (const game in DragonAgeGame) {
            // we only want to iterate over the values, not the keys
            if (isNaN(Number(game))) {
                return;
            }

            const messages: Collection<string, Message> = await channel.messages.fetch();
            const characterList = this.findCharacterListForGame(
                messages,
                DragonAgeGame[DragonAgeGame[game]]
            );

            if (!characterList) {
                valid = false;
                break;
            }

            this.logger.debug(`Found character list for game ${game}: ID ${characterList.id}`);
            await this.configuration.setString(`${listType}_Game${game}`, characterList.id);
        }

        if (!valid) {
            // Clear the channel of the other bot messages
            this.logger.debug(
                `At least one canon character list does not exist anymore for list type ${listType}. Clearing channel ${channel.name}...`
            );
            await this.channelService.clearChannelOfBotMessages(channel);

            // get the new messages
            this.logger.debug(`Sending new messages...`);
            for (const game in DragonAgeGame) {
                // we only want to iterate over the values, not the keys
                if (isNaN(Number(game))) {
                    return;
                }

                const newCharacterList = await this.sendCharacterList(
                    channel,
                    DragonAgeGame[DragonAgeGame[game]],
                    listType
                );
                await this.configuration.setString(
                    `Messages_ListType${listType}_Game${game}`,
                    newCharacterList.id
                );
            }
            return;
        }

        this.logger.debug(
            `Successfully initialized ${channel.name} with lists for list type ${listType}.`
        );
    }

    /**
     * Updates a character list with newly fetched content from the database
     *
     * @param game the game
     * @param listType the character list type
     */
    public async updateCharacterList(
        game: DragonAgeGame,
        listType: CharacterListType
    ): Promise<void> {
        this.logger.debug(`Updating character list for list type ${listType} and game ${game}.`);
        const channelId = await this.configuration.getString(
            'Channels_CharacterListChannelId_' + listType
        );
        const messageId = await this.configuration.getString(
            `Messages_ListType${listType}_Game${game}`
        );
        let list = await this.messageService.getMessageFromChannel(messageId, channelId);

        if (!list) {
            this.logger.debug(`Could not get message with stored message id ${messageId}.`);
            await this.initializeCharacterLists(listType);
            const newMessageId = await this.configuration.getString(
                `Messages_ListType${listType}_Game${game}`
            );
            list = await this.messageService.getMessageFromChannel(newMessageId, channelId);
        }

        const embeds = await this.getCharacterListContent(game, listType);
        try {
            await list.edit({ embeds: embeds });
        } catch (error) {
            throw new CommandError(
                `Failed to edit character list for list type ${listType} and game ${game}.`,
                `I could not update the character list in the channel!`,
                error
            );
        }
        this.logger.debug(`Updated character list for list type ${listType} and game ${game}.`);
    }

    /**
     * Gets one entry in a character list determined by the given data and the list type
     *
     * @param listType the list type
     * @param data the data for that entry
     * @returns the entry as a string
     */
    public getCharacterListEntry(listType: CharacterListType, data: unknown): string {
        let character;
        switch (listType) {
            case CharacterListType.Canon:
                character = data as CanonCharacter;
                return `• **${character.name}** 
                ${character.claimer ? this.userService.getMemberDisplay(character.claimer) : ''} 
                ${
                    character.availability === CanonCharacterAvailability.TemporaryClaim
                        ? '**(temporary claim)**'
                        : ''
                }
                ${
                    character.availability === CanonCharacterAvailability.Available
                        ? '**available**'
                        : ''
                }`;
            case CharacterListType.Original:
                character = data as OriginalCharacter;
                return `• **${character.name}** (${character.race}, ${
                    character.age
                }) ${this.userService.getMemberDisplay(character.member)}\n`;
        }
    }

    // endregion

    // region LIST

    /**
     * Sends one character list to the character list channel
     *
     * @param channel the channel to send the message in
     * @param game the game which the character list is for
     * @param listType the list type of the character list
     * @returns the message that was sent
     */
    private async sendCharacterList(
        channel: TextChannel,
        game: DragonAgeGame,
        listType: CharacterListType
    ): Promise<Message> {
        const embeds = await this.getCharacterListContent(game, listType);
        let message;
        try {
            message = await channel.send({
                allowedMentions: { parse: [] },
                embeds: embeds,
            });
        } catch (error) {
            this.logger.error(`Could not send message for game ${game} in channel ${channel.name}`);
            throw new Error(error);
        }
        return message;
    }

    // endregion

    // region LIST CONTENT

    /**
     * Finds an existing list for a game in a given set of messages
     *
     * @param messages the messages to search
     * @param game the game to search for
     * @returns the message if found, undefined otherwise
     */
    private findCharacterListForGame(
        messages: Collection<string, Message>,
        game: DragonAgeGame
    ): Message | undefined {
        return messages.find(
            (m) =>
                m.author.id === this.client.user.id &&
                m.embeds[0]?.title.includes(DragonAgeGameMapper.mapEnumToStringName(game))
        );
    }

    /**
     * Gets the message content and embeds for one character list
     *
     * @param game the game
     * @param listType the list type
     * @returns the constructed embeds for that list
     */
    private async getCharacterListContent(
        game: DragonAgeGame,
        listType: CharacterListType
    ): Promise<MessageEmbed[]> {
        this.logger.debug(`Getting content for list type ${listType} and game ${game}.`);
        const characters = await this.getCharacters(listType, game);
        const characterEntries: string[] = [];
        characters.forEach((character) =>
            characterEntries.push(this.getCharacterListEntry(listType, character))
        );

        // start assembling embeds
        const embeds: MessageEmbed[] = [];
        const maxContentLength = 4096;

        // if there are no characters, return a placeholder embed
        if (characterEntries.length === 0) {
            embeds.push(
                await this.embedProvider.get(EmbedType.Detailed, EmbedLevel.Guild, {
                    content: `No characters yet...`,
                })
            );
        }

        // Construct multiple embeds for the character entries if needed
        while (characterEntries.length > 0) {
            let content = '';
            while (content.length < maxContentLength) {
                if (characterEntries.length === 0) break;
                content += characterEntries.pop() + '\n';
            }
            embeds.push(
                await this.embedProvider.get(EmbedType.Detailed, EmbedLevel.Guild, {
                    content: content,
                })
            );
        }

        // set the title on the first embed
        const title = `${await this.emojiProvider.get(
            DragonAgeGame[game]
        )} ${DragonAgeGameMapper.mapEnumToStringName(game)}`;
        embeds[0].setTitle(title);

        this.logger.debug(
            `Returning ${embeds.length} embeds for list type ${listType} and game ${game}.`
        );
        return embeds;
    }

    /**
     * Gets the characters for a given listType
     *
     * @param listType the list type
     * @param game the game
     * @returns an array of unknown objects from the database
     */
    private async getCharacters(
        listType: CharacterListType,
        game: DragonAgeGame
    ): Promise<unknown[]> {
        if (listType === CharacterListType.Original) {
            const foundOcs = await OriginalCharacterModel.find({ game: game })
                .sort({ name: 'desc' })
                .exec();
            const mappedOcs: OriginalCharacter[] = [];
            for (const oc of foundOcs) {
                mappedOcs.push(
                    await this.characterMapper.mapOriginalCharacterSchemaToOriginalCharacter(oc)
                );
            }
            return mappedOcs;
        }

        if (listType === CharacterListType.Canon) {
            const foundCcs = await CanonCharacterModel.find({ game: game })
                .sort({ name: 'desc' })
                .exec();
            const mappedCcs: CanonCharacter[] = [];
            for (const cc of foundCcs) {
                mappedCcs.push(
                    await this.characterMapper.mapCanonCharacterSchemaToCanonCharacter(cc)
                );
            }
            return mappedCcs;
        }

        this.logger.error(`No mapping for character model in database for list type ${listType}`);
        return [];
    }

    // endregion
}
