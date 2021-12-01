import { Service } from '@services/service';
import { MessageReaction, User } from 'discord.js';
import { injectable } from 'inversify';

/** Handles different functions in relation to the Discord (Message)Reactions objects */
@injectable()
export class ReactionService extends Service {
    /**
     * Removes a certain user's reaction from a message
     *
     * @param reaction the message reaction to remove
     * @param user The user who created the reaction
     * @returns Resolves when done
     */
    public async removeUserReaction(reaction: MessageReaction, user: User): Promise<void> {
        await reaction.users.remove(user).catch((error) => {
            this.logger.error(
                `Trying to remove a reaction ${reaction.emoji.name} failed for user ${user.username} on Message ID ${reaction.message.id}.`,
                this.logger.prettyError(error)
            );
        });
    }
}
