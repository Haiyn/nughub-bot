/** An error that is thrown by a command when it aborts execution */
export class CommandError {
    /** The internal message that will be logged */
    internalMessage: string;

    /** The message that can be given as a response to the user */
    userMessage?: string;

    /** An error if one was caught */
    error?: Error;

    constructor(internalMessage: string, userMessage?: string, error?: Error) {
        this.internalMessage = internalMessage;
        this.userMessage = userMessage;
        this.error = error;
    }
}
