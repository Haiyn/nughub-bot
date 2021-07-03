import { CommandContext } from "@models/command-context";
import {rejects} from "assert";

export abstract class Command {
    readonly names: string[]
    readonly description: string;
    readonly usageHint: string;
    readonly permissionLevel: number = 0;

    getHelpMessage(): string {
        return this.description + "\n" + "Usage: '" + this.usageHint + "'"
    }
    run(context: CommandContext): Promise<void> {
        return Promise.reject();
    }
}