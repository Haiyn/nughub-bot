export interface ApplicationCommandValidationResultInterface {
    /**
     * Whether the data given is valid or not
     */
    valid: boolean;

    /**
     * The internal message why the validation succeeded or failed.
     */
    internalMessage?: string;

    /**
     * The message that can be replied to the user.
     */
    userMessage?: string;
}
