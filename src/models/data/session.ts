import { Character } from '@models/data/character';
import { Message, TextChannel } from 'discord.js';

/** Represents an ongoing session integrated into Discord */
export class Session {
    /** The Discord TextChannel where the RP is */
    channel: TextChannel;

    /** The turn order of Characters */
    turnOrder: Character[];

    /** The character that currently has the turn */
    currentTurn: Character;

    /** The message that was posted to the current sessions channel */
    sessionPost: Message;

    timestampPost?: Message;

    lastTurnAdvance?: Date;

    isMainQuest?: boolean;

    constructor(
        channel: TextChannel,
        turnOrder: Character[],
        currentTurn: Character,
        sessionPost: Message,
        timestampPost?: Message,
        lastTurnAdvance?: Date,
        isMainQuest?: boolean
    ) {
        this.channel = channel;
        this.turnOrder = turnOrder;
        this.currentTurn = currentTurn;
        this.sessionPost = sessionPost;
        this.timestampPost = timestampPost;
        this.timestampPost = timestampPost;
        this.lastTurnAdvance = lastTurnAdvance;
        this.isMainQuest = isMainQuest;
    }
}
