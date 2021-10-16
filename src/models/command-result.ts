import { injectable } from 'inversify';
import { CommandContext } from '@models/command-context';
import { Command } from '@src/commands';

@injectable()
export class CommandResult {
    private readonly _command: Command;
    private readonly _context: CommandContext;
    private readonly _success: boolean;
    private readonly _message: string;
    private readonly _error?: Error;

    constructor(
        command: Command,
        context: CommandContext,
        success: boolean,
        message: string,
        error?: Error
    ) {
        this._command = command;
        this._context = context;
        this._success = success;
        this._message = message;
        this._error = error;
    }

    get error(): Error {
        return this._error;
    }
    get message(): string {
        return this._message;
    }
    get success(): boolean {
        return this._success;
    }
    get context(): CommandContext {
        return this._context;
    }
    get command(): Command {
        return this._command;
    }
}
