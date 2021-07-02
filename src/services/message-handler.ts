import { Message } from "discord.js";
import { inject, injectable } from "inversify";
import { TYPES } from "types";
import { PrefixFinder } from '@services/prefix-finder';

@injectable()
export class MessageHandler {
    private prefixFinder: PrefixFinder;

    constructor(
        @inject(TYPES.PrefixFinder) prefixFinder: PrefixFinder
    ) {
        this.prefixFinder = prefixFinder;
    }

    handle(message: Message): Promise<Message | Message[]> {
        if (this.prefixFinder.isPrefixed(message.content)) {
            return message.reply('pong!');
        }

        return Promise.reject();
    }
}