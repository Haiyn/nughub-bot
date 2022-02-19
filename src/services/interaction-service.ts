import { ConfigurationProvider } from '@providers/configuration-provider';
import { ChannelService } from '@services/channel-service';
import { Service } from '@services/service';
import { EmbedProvider, StringProvider } from '@src/providers';
import { TYPES } from '@src/types';
import {
    AwaitMessagesOptions,
    Client,
    ColorResolvable,
    CommandInteraction,
    InteractionReplyOptions,
    Message,
    MessageEmbed,
} from 'discord.js';
import { inject, injectable } from 'inversify';
import { Logger } from 'tslog';

/** Handles different functions in relation to the Discord interaction objects */
@injectable()
export class InteractionService extends Service {
    /** The channel service. Since inter are in channels, this is needed */
    readonly channelService: ChannelService;
    readonly embedProvider: EmbedProvider;
    readonly stringProvider: StringProvider;

    constructor(
        @inject(TYPES.Client) client: Client,
        @inject(TYPES.CommandLogger) logger: Logger,
        @inject(TYPES.ConfigurationProvider) configuration: ConfigurationProvider,
        @inject(TYPES.ChannelService) channelService: ChannelService,
        @inject(TYPES.EmbedProvider) embedProvider: EmbedProvider,
        @inject(TYPES.EmbedProvider) stringProvider: StringProvider
    ) {
        super(client, logger, configuration);
        this.channelService = channelService;
        this.embedProvider = embedProvider;
        this.stringProvider = stringProvider;
    }

    /**
     * Replies to an interaction with auto-ephemeral function if message is in an RP channel
     *
     * @param interaction The interaction to reply to
     * @param options The interaction options that should be attached to the reply
     * @returns Resolves when finished
     */
    public async reply(
        interaction: CommandInteraction,
        options: InteractionReplyOptions
    ): Promise<void> {
        try {
            let isEphemeral = true;
            // If ephemeral wasn't explicitly set, check if it should be
            if (!options.ephemeral) {
                isEphemeral = await this.configuration.isInSet(
                    'Channels_RpChannelIds',
                    interaction.channel.id
                );
            }

            if (interaction.replied) {
                this.logger.warn(`Trying to reply to an interaction that already has a reply!`);
                return Promise.resolve();
            }

            if (interaction.deferred) {
                await interaction.editReply({ ...options });
                return Promise.resolve();
            }

            await interaction.reply({ ...options, ephemeral: isEphemeral });

            return Promise.resolve();
        } catch (error) {
            this.logger.error(
                `Failed to safely reply to interaction (ID: ${interaction.id}): `,
                this.logger.prettyError(error)
            );
            return Promise.resolve();
        }
    }

    /**
     * Waits for a reply by the interaction creator
     *
     * @param interaction the interaction, used to determine the author
     * @returns the first message of the interaction creator in the same channel or null if it timed out
     */
    public async awaitQueryReply(interaction: CommandInteraction): Promise<Message | null> {
        const authorFilter = (message: Message) => message.author.id === interaction.member.user.id;
        const awaitMessageOptions: AwaitMessagesOptions = {
            filter: authorFilter,
            max: 1,
            time: 30000,
            errors: ['time'],
        };

        const collection = await interaction.channel
            .awaitMessages(awaitMessageOptions)
            .catch(async () => {
                this.logger.info(
                    `User input has timed out after ${
                        awaitMessageOptions.time / 1000
                    } seconds. Sending timeout message.`
                );
                // Manually construct embed because async bullshittery that i have no patience to deal with
                const embed = new MessageEmbed({
                    description: `Reply timed out.`,
                    color: '#ffa500' as ColorResolvable,
                });
                await interaction.channel.send({ embeds: [embed] });
                return Promise.resolve(null);
            });
        if (collection !== null) {
            return collection.first();
        }
    }
}
