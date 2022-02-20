import { model, Schema } from 'mongoose';

export interface CanonCharacterSchema {
    name: string;
    game: number;
    availability: number;
    claimerId?: string;
}

const canonCharacterSchema = new Schema<CanonCharacterSchema>(
    {
        name: { type: String, required: true },
        game: { type: Number, required: true },
        availability: { type: Number, required: true },
        claimerId: { type: String, required: false },
    },
    { collection: 'CanonCharacters' }
);

export const CanonCharacterModel = model<CanonCharacterSchema>(
    'CanonCharacter',
    canonCharacterSchema
);
