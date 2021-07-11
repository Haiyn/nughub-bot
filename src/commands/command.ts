import { CommandContext } from "@models/command-context";
import { injectable } from "inversify";
import { CommandResult } from "@models/command-result";

@injectable()
export class Command {
    readonly names: string[]
    readonly description: string;
    readonly usageHint: string;
    readonly permissionLevel: number = 0;

    getHelpMessage(): string {
        return this.description + "\n" + "Usage: '" + this.usageHint + "'";
    }

    run(context: CommandContext): Promise<CommandResult> {
        return Promise.resolve(new CommandResult(this, context, false, "not implemented."));
    }
}