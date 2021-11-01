export class CommandError {
    internalMessage: string;
    userMessage?: string;
    error?: Error;

    constructor(internalMessage: string, userMessage?: string, error?: Error) {
        this.internalMessage = internalMessage;
        this.userMessage = userMessage;
        this.error = error;
    }
}
