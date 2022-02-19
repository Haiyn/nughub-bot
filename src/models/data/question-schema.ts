import { model, Schema } from 'mongoose';

export interface IQuestionSchema {
    content: string;
    dateAdded: Date;
    used: boolean;
    submitterId: string;
}

const questionSchema = new Schema<IQuestionSchema>(
    {
        content: { type: String, required: true },
        dateAdded: { type: Date, required: true },
        used: { type: Boolean, required: true },
        submitterId: { type: String, required: true },
    },
    { collection: 'Questions' }
);

export const QuestionModel = model<IQuestionSchema>('Question', questionSchema);
