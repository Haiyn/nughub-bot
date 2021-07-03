import {inject, injectable} from "inversify";
import { TYPES } from "@src/types";

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