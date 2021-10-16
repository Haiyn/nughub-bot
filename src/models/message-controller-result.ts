import { injectable } from 'inversify';

@injectable()
export class MessageControllerResult {
    public readonly commandExecuted: boolean;
    public readonly result?: string;

    constructor(commandExecuted: boolean, result?: string) {
        this.commandExecuted = commandExecuted;
        this.result = result;
    }
}
