import { Command } from "@commands/command";
import { CommandContext } from "@models/command-context";
import { injectable } from "inversify";
import { CommandResult } from "@models/command-result";
// import { SessionModel } from "@models/session";

@injectable()
export class SessionStart extends Command {
    names = ["start"];
    description = "Starts an RP session in the given channel with the given turn order.";
    usageHint = process.env.PREFIX + "start #<channel name> @User1 @User2 ...";

    public async run(context: CommandContext): Promise<CommandResult> {
        if(!this.validateArguments(context.args)) {
            return Promise.resolve(new CommandResult(this, context, true, "Arguments not valid. Skipped command."));
        }
        try {

            return Promise.resolve(new CommandResult(this, context, true,  "Successfully started session."));
        } catch(error) {
            return Promise.reject(new CommandResult(this, context, false, "Ping command failed.", error));
        }

    }

    public validateArguments(args: string[]): boolean {
        this.logger.trace(`Arguments for start command: ${JSON.stringify(args)}`);
        return false;
    }
}