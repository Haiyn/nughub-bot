import { characterSchema, ICharacterSchema } from '@models/data/character-schema';
import { model, Schema } from 'mongoose';

/** The interface of the Session database object */
export interface ISessionSchema {
    /** The discord ID of the channel where the RP is */
    channelId: string;

    /** An array of the character (user ID and character name), representing the turn order of the RP */
    turnOrder: Array<ICharacterSchema>;

    /** The character that currently has the turn */
    currentTurn: ICharacterSchema;

    /** The ID of the discord message in the current sessions for this RP session */
    sessionPostId: string;
}

/** The mongoose schema of the session database object */
const sessionSchema = new Schema<ISessionSchema>(
    {
        channelId: { type: String, required: true },
        turnOrder: { type: [characterSchema], required: true },
        currentTurn: { type: characterSchema, required: true },
        sessionPostId: { type: String, required: true },
    },
    { collection: 'Sessions' }
);

/** The mongoose Model that can be called to access the database collections */
export const SessionModel = model<ISessionSchema>('Session', sessionSchema);
