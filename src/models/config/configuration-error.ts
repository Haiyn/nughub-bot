/** An error that is thrown when fetching a config failed */
export class ConfigurationError {
    /** The internal message that will be logged */
    message: string;

    /** An error if one was caught */
    error?: Error;

    constructor(message: string, error?: Error) {
        this.message = message;
        this.error = error;
    }
}
