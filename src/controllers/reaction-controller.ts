import { Controller } from '@controllers/controller';
import { ReactionService } from '@services/reaction-service';
import {
    ConfigurationProvider,
    EmbedProvider,
    EmojiProvider,
    PermissionProvider,
} from '@src/providers';
import { TYPES } from '@src/types';
import { Client, MessageReaction, User } from 'discord.js';
import { inject, injectable } from 'inversify';
import { Logger } from 'tslog';

@injectable()
export class ReactionController extends Controller {
    private readonly emojiProvider: EmojiProvider;
    private readonly reactionService: ReactionService;

    constructor(
        @inject(TYPES.BaseLogger) logger: Logger,
        @inject(TYPES.Client) client: Client,
        @inject(TYPES.GuildId) guildId: string,
        @inject(TYPES.Token) token: string,
        @inject(TYPES.ConfigurationProvider) configuration: ConfigurationProvider,
        @inject(TYPES.EmbedProvider) embedProvider: EmbedProvider,
        @inject(TYPES.PermissionProvider) permissionProvider: PermissionProvider,
        @inject(TYPES.EmojiProvider) emojiProvider: EmojiProvider,
        @inject(TYPES.ReactionService) reactionService: ReactionService
    ) {
        super(logger, guildId, token, client, configuration, embedProvider, permissionProvider);
        this.emojiProvider = emojiProvider;
        this.reactionService = reactionService;
    }

    /**
     * Handles a reaction add event
     *
     * @param reaction The created message reaction
     * @param user The user that created the reaction
     * @returns Resolves when done handling message
     */
    public async handleReactionAdd(reaction: MessageReaction, user: User): Promise<void> {
        await this.handleReactionRemoval(reaction, user);
    }

    /**
     * Handles all removals of added reactions
     *
     * @param reaction The created message reaction
     * @param user The user that created the reaction
     * @returns Resolves when done handling message
     */
    private async handleReactionRemoval(reaction: MessageReaction, user: User): Promise<void> {
        // Remove disallowed character intro reactions
        if (
            reaction.message.channelId ===
                (await this.configuration.getString('Channels_OcIntroductionsChannelId')) &&
            reaction.count > 1
        ) {
            this.logger.info(
                `User ${user.username} ${user.id} tried to add a reaction ${reaction.emoji.name} to a character intro. Removing...`
            );
            await this.reactionService.removeUserReaction(reaction, user);
            return Promise.resolve();
        }

        // Remove disallowed rp channel reactions
        if (
            (await this.configuration.isIn('Channels_RpChannelIds', reaction.message.channelId)) &&
            reaction.emoji.name !== (await this.emojiProvider.get('TUPPER.EDIT')) &&
            reaction.emoji.name !== (await this.emojiProvider.get('TUPPER.DELETE'))
        ) {
            this.logger.info(
                `User ${user.username} ${user.id} tried to add a non-Tupper reaction ${reaction.emoji.name} to a message in an RP channel. Removing...`
            );
            await this.reactionService.removeUserReaction(reaction, user);
            return Promise.resolve();
        }
    }
}
