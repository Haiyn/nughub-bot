import { model, Schema } from "mongoose";
import { TextChannel, User } from "discord.js";

export class Session {
    channel: TextChannel;
    order: User[];
    currentTurn: User;
    active: boolean;

    constructor(channel: TextChannel, order: User[], currentTurn: User, active: boolean) {
        this.channel = channel;
        this.order = order;
        this.currentTurn = currentTurn;
        this.active = active;
    }
}

export interface ISession {
    channel: string;
    order: string[];
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