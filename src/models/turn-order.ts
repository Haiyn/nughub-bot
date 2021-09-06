import { model, Schema, Document } from "mongoose";

interface ITurnOrder extends Document {
    channel: string;
    order: Array<string>;
    currentTurn: string;
}

const schema = new Schema<ITurnOrder>({
    channel: { type: String, required: true },
    order: { type: [String], required: true },
    currentTurn: String
});

export const TurnOrder = model<ITurnOrder>("TurnOrder", schema);