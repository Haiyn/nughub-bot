import { model, Schema } from 'mongoose';

export interface CharacterPairingSchema {
    game: number;
    userId1: string;
    name1: string;
    userId2: string;
    name2: string;
}

const characterPairingSchema = new Schema<CharacterPairingSchema>(
    {
        game: { type: Number, required: true },
        userId1: { type: String, required: true },
        name1: { type: String, required: true },
        userId2: { type: String, required: true },
        name2: { type: String, required: true },
    },
    { collection: 'CharacterPairings' }
);

export const CharacterPairingModel = model<CharacterPairingSchema>(
    'CharacterPairing',
    characterPairingSchema
);
