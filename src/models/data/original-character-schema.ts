import { ICharacterSchema } from '@src/models';
import { model, Schema } from 'mongoose';

export interface OriginalCharacterSchema extends ICharacterSchema {
    game: number;
    race: string;
    age: number;
    pronouns: string;
}

const originalCharacterSchema = new Schema<OriginalCharacterSchema>(
    {
        userId: { type: String, required: true },
        name: { type: String, required: true },
        game: { type: Number, required: true },
        race: { type: String, required: true },
        age: { type: Number, required: true },
        pronouns: { type: String, required: true },
    },
    { collection: 'OriginalCharacters' }
);

export const OriginalCharacterModel = model<OriginalCharacterSchema>(
    'OriginalCharacter',
    originalCharacterSchema
);
