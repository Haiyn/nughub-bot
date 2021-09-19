import { Message, TextChannel, User } from "discord.js";
import { Character } from "@models/character";

export class Session {
    channel: TextChannel;
    turnOrder: Character[];
    currentTurn: User;
    sessionPost: Message;

    constructor(channel: TextChannel, turnOrder: Character[], currentTurn: User, sessionPost: Message) {
        this.channel = channel;
        this.turnOrder = turnOrder;
        this.currentTurn = currentTurn;
        this.sessionPost = sessionPost;
    }
}

