/** An error that is thrown when an invalid user input was found */
export class CommandValidationError {
    /** An internal message that can be logged */
    internalMessage: string;

    /** The message that can be given to the user */
    userMessage: string;

    constructor(internalMessage: string, userMessage: string) {
        this.internalMessage = internalMessage;
        this.userMessage = userMessage;
    }
}
