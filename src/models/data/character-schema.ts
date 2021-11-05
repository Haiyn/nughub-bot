import { Schema } from 'mongoose';

/** The interface of the Character database object */
export interface ICharacterSchema {
    /** The Discord user id of the character owner */
    userId: string;

    /** The name of the character */
    name: string;
}

/** The mongoose schema of the character database object */
export const characterSchema = new Schema<ICharacterSchema>({
    userId: { type: String, required: true },
    name: { type: String, required: true },
});
