import { model, Schema } from 'mongoose';

/** The interface of the Reminder database object */
export interface IReminderSchema {
    name: string;
    userId: string;
    characterName: string;
    date: Date;
    channelId: string;
}

/** The mongoose schema of the reminder database object */
export const reminderSchema = new Schema<IReminderSchema>(
    {
        name: { type: 'String', required: true },
        userId: { type: 'String', required: true },
        characterName: { type: 'String', required: true },
        date: { type: 'Date', required: true },
        channelId: { type: 'String', required: true },
    },
    { collection: 'Reminders' }
);

/** The mongoose Model that can be called to access the database collections */
export const ReminderModel = model<IReminderSchema>('Reminder', reminderSchema);
