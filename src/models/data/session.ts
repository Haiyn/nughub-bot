import { Character } from '@models/data/character';
import { Message, TextChannel } from 'discord.js';

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
