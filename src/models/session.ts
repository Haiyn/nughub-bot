import { Message, TextChannel } from 'discord.js';
import { Character } from '@models/character';

export class Session {
    channel: TextChannel;
    turnOrder: Character[];
    currentTurn: Character;
    sessionPost: Message;

    constructor(
        channel: TextChannel,
        turnOrder: Character[],
        currentTurn: Character,
        sessionPost: Message
    ) {
        this.channel = channel;
        this.turnOrder = turnOrder;
        this.currentTurn = currentTurn;
        this.sessionPost = sessionPost;
    }
}
