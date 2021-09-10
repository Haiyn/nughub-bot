import { CommandContext } from "@models/command-context";
import { inject, injectable } from "inversify";
import { CommandResult } from "@models/command-result";
import { Logger } from "tslog";
import { TYPES } from "@src/types";

export interface ICommand {
    readonly names: string[]
    readonly description: string;
    readonly usageHint: string;
    readonly permissionLevel: number;
    readonly logger: Logger;

    getHelpMessage(): string;
    run(context: CommandContext): Promise<CommandResult>;
}

@injectable()
export class Command implements ICommand {
    readonly names: string[]
    readonly description: string;
    readonly usageHint: string;
    readonly permissionLevel: number = 0;

    readonly logger: Logger;

    constructor(
        @inject(TYPES.CommandLogger) logger: Logger
    ) {
        this.logger = logger;
    }

    public getHelpMessage(): string {
        return this.description + "\n" + "Usage: '" + this.usageHint + "'";
    }

    public run(context: CommandContext): Promise<CommandResult> {
        return Promise.resolve(new CommandResult(this, context, false, "not implemented."));
    }

    public validateArguments(args: string[]): boolean {
        return args.length == 0;
    }
}