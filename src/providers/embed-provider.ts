import { ConfigurationError } from '@models/config/configuration-error';
import { EmbedData } from '@models/ui/embed-data';
import { EmbedLevel } from '@models/ui/embed-level';
import { EmbedType } from '@models/ui/embed-type';
import container from '@src/inversify.config';
import { Provider } from '@src/providers/provider';
import { TYPES } from '@src/types';
import { Client, ColorResolvable, MessageEmbed } from 'discord.js';
import { inject, injectable } from 'inversify';
import * as IORedis from 'ioredis';
import { Redis } from 'ioredis';
import { Logger } from 'tslog';

/** Provides embed resources with configured colors and appearance */
@injectable()
export class EmbedProvider extends Provider {
    /** The redis client */
    private redisClient: Redis;

    /** The Discord client */
    private client: Client;

    /**
     * Constructs a config provider with a custom keyPrefix for the redis client
     *
     * @param logger The ts-log logger
     * @param client The discord bot client
     */
    constructor(
        @inject(TYPES.ProviderLogger) logger: Logger,
        @inject(TYPES.Client) client: Client
    ) {
        super(logger);
        this.redisClient = new IORedis(
            container.get(TYPES.RedisHost),
            container.get(TYPES.RedisPort),
            {
                password: container.get(TYPES.RedisPassword),
                keyPrefix: 'CONFIGURATION_Guild_Color_',
            }
        );
        this.client = client;
    }

    /**
     * Returns an embed
     *
     * @param type The embed type that should be used
     * @param level The severity level the embed should have
     * @param data The data that should be in the embed
     * @returns A discord.js Message Embed
     */
    public async get(type: EmbedType, level: EmbedLevel, data: EmbedData): Promise<MessageEmbed> {
        if (data === undefined || data === null) {
            this.logger.error(`Given data is empty!`);
            return new MessageEmbed({
                description: `Failed to construct error message.`,
                color: 'RED',
            });
        }
        if (data.content?.includes('Error')) {
            level = EmbedLevel.Error;
        }
        const color: ColorResolvable = await this.mapEmbedLevelToColorResolvable(level);

        const embedData: Partial<MessageEmbed> = await this.mapEmbedDataToPartialMessageEmbedByType(
            type,
            data
        );

        return new MessageEmbed({ ...embedData, color: color });
    }

    /**
     * Maps the value of an EmbedLevel to a ColorResolvable
     *
     * @param level The severity level
     * @returns A ColorResolvable
     * @throws {ConfigurationError} throws when guild color could not be found or has invalid value
     */
    private async mapEmbedLevelToColorResolvable(level: EmbedLevel): Promise<ColorResolvable> {
        const colorValue: string = await this.redisClient.get(level.toString());
        if (!colorValue)
            throw new ConfigurationError(
                `Could not find a Guild color for level ${level.toString()}`
            );
        let color: ColorResolvable;
        try {
            color = colorValue as ColorResolvable;
        } catch (error) {
            throw new ConfigurationError(
                `Value for ${level.toString()} (${colorValue}) cannot be parsed as ColorResolvable`,
                error
            );
        }
        return color;
    }

    /**
     * Maps given data to a partial MessageEmbed determined by the given EmbedType
     *
     * @param embedType The embed type to map the data by
     * @param data The data to map
     * @returns A partial MessageEmbed
     * @throws {ConfigurationError} Throws when given an unknown or unimplemented EmbedType
     */
    private mapEmbedDataToPartialMessageEmbedByType(
        embedType: EmbedType,
        data: EmbedData
    ): Partial<MessageEmbed> {
        let embedData: Partial<MessageEmbed>;
        switch (embedType) {
            case EmbedType.Minimal:
                embedData = {
                    description: data.content,
                };
                break;
            case EmbedType.Detailed:
                embedData = {
                    author: {
                        name: data.authorName,
                        iconURL: data.authorIcon,
                    },
                    title: data.title,
                    description: data.content,
                    footer: {
                        text: data.footer,
                    },
                    image: {
                        url: data.image,
                    },
                };
                break;
            case EmbedType.Technical:
                embedData = {
                    title: data.title,
                    description: data.content,
                    footer: {
                        iconURL: this.client.user.avatarURL(),
                        text: 'Internal Message',
                    },
                    timestamp: Date.now(),
                };
                break;
            case EmbedType.Separator:
                embedData = {
                    description: data.content,
                };
                break;
            default:
                throw new ConfigurationError(`Enum Type ${embedType} is not implemented`);
        }
        return embedData;
    }
}
