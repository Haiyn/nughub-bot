import { model, Schema, Document } from "mongoose";

interface ISession extends Document {
    channel: string;
    order: Array<string>;
    currentTurn: string;
    active: boolean;
}

const schema = new Schema<ISession>({
    channel: { type: String, required: true },
    order: { type: [String], required: true },
    currentTurn: String,
    active: Boolean
}, { collection: "Sessions" });

export const SessionModel = model<ISession>("Session", schema);