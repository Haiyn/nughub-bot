import { model, Schema } from "mongoose";
import { characterSchema, ICharacterSchema } from "@models/character-schema";

export interface ISessionSchema {
    channelId: string;
    turnOrder: Array<ICharacterSchema>;
    currentTurn: ICharacterSchema;
    sessionPostId: string;
}

const sessionSchema = new Schema<ISessionSchema>({
    channelId: { type: String, required: true },
    turnOrder: { type: [characterSchema], required: true },
    currentTurn: { type: characterSchema, required: true},
    sessionPostId: { type: String, required: true },
}, { collection: "Sessions" });

export const SessionModel = model<ISessionSchema>("Session", sessionSchema);