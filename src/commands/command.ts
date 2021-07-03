import { CommandContext } from "@models/command-context";
import { injectable } from "inversify";

@injectable()
export class Command {
    readonly names: string[]
    readonly description: string;
    readonly usageHint: string;
    readonly permissionLevel: number = 0;

    getHelpMessage(): string {
        return this.description + "\n" + "Usage: '" + this.usageHint + "'";
    }

    run(context: CommandContext): Promise<void> {
        return Promise.reject();
    }
}