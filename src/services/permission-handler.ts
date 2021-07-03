import {inject, injectable} from "inversify";
import { TYPES } from "@src/types";
import {CommandContext} from "@models/command-context";
import {Command} from "@src/commands";

@injectable()
export class PermissionHandler {
    private readonly prefix: string;

    constructor(
        @inject(TYPES.Prefix) prefix: string
    ) {
        this.prefix = prefix;
    }

    public hasPermission(context: CommandContext, command: Command): boolean {
        // TODO: get permission level for context.author.id OR context.author.role == Moderator
        return true;
    }

    public setPermission(): Promise<void> {
        // TODO: Set user at certain permission level
        Promise.resolve();
        return;
    }
}