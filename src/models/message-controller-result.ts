import { injectable } from "inversify";

@injectable()
export class MessageControllerResult {
    private readonly _commandExecuted: boolean;
    private readonly _error?: Error;

    constructor(
        commandExecuted: boolean,
        error?: Error
    ) {
        this._commandExecuted = commandExecuted;
        this._error = error;
    }

    get error(): Error {
        return this._error;
    }

    get commandExecuted(): boolean {
        return this._commandExecuted;
    }
}