import {inject, injectable} from "inversify";
import { TYPES } from "@src/types";
import {Logger} from "tslog";
import {Message} from "discord.js";

@injectable()
export class PrefixFinder {
    private readonly prefix: string;
    private readonly logger: Logger;

    constructor(
        @inject(TYPES.Prefix) prefix: string,
        @inject(TYPES.ServiceLogger) logger: Logger
    ) {
        this.prefix = prefix;
        this.logger = logger;
    }

    public isPrefixed(message: Message): boolean {
        let isPrefixed = message.content.startsWith(this.prefix);
        this.logger.debug(`Message ID ${message.id}: is ${isPrefixed ? "" : "not"} prefixed.`)
        return isPrefixed;
    }
}