import { injectable } from "inversify";

@injectable()
export class ServiceResult {
    private readonly _success: boolean;
    private readonly _message: string;
    private readonly _error?: Error;

    constructor(
        success: boolean,
        message: string,
        error?: Error
    ) {
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
}