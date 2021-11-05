/** A result that is returned when a command run was finished */
export class CommandResult {
    /** Whether the command was executed or not (e.g. if there is nothing to do) */
    executed: boolean;

    /** A message describing the result */
    message: string;

    constructor(executed: boolean, message: string) {
        this.executed = executed;
        this.message = message;
    }
}
