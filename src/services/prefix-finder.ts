import {inject, injectable} from "inversify";
import { Message } from "discord.js";
import { TYPES } from "types";

@injectable()
export class PrefixFinder {
    private readonly prefix: string;


    constructor(
        @inject(TYPES.Prefix) prefix: string
    ) {
        this.prefix = prefix;
    }

    public isPrefixed(stringToCheck: string): boolean {
        return stringToCheck.startsWith(this.prefix);
    }
}