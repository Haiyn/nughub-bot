export class CommandValidationError {
    internalMessage: string;
    userMessage: string;

    constructor(internalMessage: string, userMessage: string) {
        this.internalMessage = internalMessage;
        this.userMessage = userMessage;
    }
}
