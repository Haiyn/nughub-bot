import { model, Schema } from "mongoose";
import { characterSchema, ICharacterSchema } from "@models/character-schema";

export interface ISessionSchema {
    channelId: string;
    turnOrder: Array<ICharacterSchema>;
    currentTurnId: string;
    sessionPostId: string;
}

const sessionSchema = new Schema<ISessionSchema>({
    channelId: { type: String, required: true },
    turnOrder: { type: [characterSchema], required: true },
    currentTurnId: String,
    sessionPostId: { type: String, required: true },
}, { collection: "Sessions" });

export const SessionModel = model<ISessionSchema>("Session", sessionSchema);