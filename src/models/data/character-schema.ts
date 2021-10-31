import { Schema } from 'mongoose';

export interface ICharacterSchema {
    userId: string;
    name: string;
}

export const characterSchema = new Schema<ICharacterSchema>({
    userId: { type: String, required: true },
    name: { type: String, required: true },
});
