export class ApplicationCommandError {
    internalMessage: string;
    userMessage?: string;
    error?: Error;

    constructor(internalMessage: string, userMessage?: string, error?: Error) {
        this.internalMessage = internalMessage;
        this.userMessage = userMessage;
        this.error = error;
    }
}
