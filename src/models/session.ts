import { model, Schema } from "mongoose";
import { Message, TextChannel, User } from "discord.js";

export class Session {
    channel: TextChannel;
    order: Map<User, string>;
    currentTurn: User;
    sessionPost: Message;

    constructor(channel: TextChannel, order: Map<User, string>, currentTurn: User, sessionPost: Message) {
        this.channel = channel;
        this.order = order;
        this.currentTurn = currentTurn;
        this.sessionPost = sessionPost;
    }
}

export interface ISession {
    channel: string;
    order: Map<string, string>;
    currentTurn: string;
    sessionPost: string;
}

const schema = new Schema<ISession>({
    channel: { type: String, required: true },
    order: [{
        userId: String,
        name: String
    }],
    currentTurn: String,
    sessionPost: { type: String, required: true },
}, { collection: "Sessions" });

export const SessionModel = model<ISession>("Session", schema);