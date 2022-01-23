import { model, Schema } from 'mongoose';

/** The interface of the Hiatus database object */
export interface IHiatusSchema {
    userId: string;
    reason: string;
    expires: number;
    hiatusPostId: string;
}

/** The mongoose schema of the reminder database object */
export const hiatusSchema = new Schema<IHiatusSchema>(
    {
        userId: { type: 'String', required: true },
        reason: { type: 'String', required: true },
        expires: { type: 'Number', required: false },
        hiatusPostId: { type: 'String', required: true },
    },
    { collection: 'Hiatus' }
);

/** The mongoose Model that can be called to access the database collections */
export const HiatusModel = model<IHiatusSchema>('Hiatus', hiatusSchema);
