import { Mapper } from '@src/mappers/mapper';
import {
    Character,
    ConfigurationKeys,
    ICharacterSchema,
    ISessionSchema,
    Session,
} from '@src/models';
import { User } from 'discord.js';
import { injectable } from 'inversify';

@injectable()
export class SessionMapper extends Mapper {
    public async mapSessionSchemaToSession(sessionSchema: ISessionSchema): Promise<Session> {
        const channel = this.channelService.getTextChannelByChannelId(sessionSchema.channelId);
        const turnOrder: Character[] = [];
        for (const characterSchema of sessionSchema.turnOrder) {
            turnOrder.push(await this.mapCharacterSchemaToCharacter(characterSchema));
        }
        const currentTurn: Character = await this.mapCharacterSchemaToCharacter(
            sessionSchema.currentTurn
        );
        const sessionPost = await this.messageService.getMessageFromChannel(
            sessionSchema.sessionPostId,
            await this.configuration.getString(ConfigurationKeys.Channels_CurrentSessionsChannelId)
        );
        let timestampPost;
        if (sessionSchema.timestampPostId) {
            timestampPost = await this.messageService.getMessageFromChannel(
                sessionSchema.timestampPostId,
                await this.configuration.getString(ConfigurationKeys.Channels_TimestampsChannelId)
            );
        }
        return {
            channel: channel,
            turnOrder: turnOrder,
            currentTurn: currentTurn,
            sessionPost: sessionPost,
            timestampPost: timestampPost !== undefined ? timestampPost : undefined,
            lastTurnAdvance: sessionSchema.lastTurnAdvance,
        };
    }

    public async mapCharacterSchemaToCharacter(
        characterSchema: ICharacterSchema
    ): Promise<Character> {
        const user: User = await this.userService.getUserById(characterSchema.userId);
        return {
            user: user,
            name: characterSchema.name,
        };
    }

    public mapSessionToSessionSchema(session: Session): ISessionSchema {
        const turnOrder: ICharacterSchema[] = [];
        session.turnOrder.forEach((character) => {
            turnOrder.push(this.mapCharacterToCharacterSchema(character));
        });
        const currentTurn = this.mapCharacterToCharacterSchema(session.currentTurn);
        return {
            channelId: session.channel.id,
            turnOrder: turnOrder,
            currentTurn: currentTurn,
            sessionPostId: session.sessionPost.id,
            timestampPostId:
                session.timestampPost !== undefined ? session.timestampPost.id : undefined,
            lastTurnAdvance: session.lastTurnAdvance,
        };
    }

    public mapCharacterToCharacterSchema(character: Character): ICharacterSchema {
        return {
            userId: character.user.id,
            name: character.name,
        };
    }
}
