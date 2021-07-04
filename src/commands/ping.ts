import { Command } from "@commands/command";
import { CommandContext } from "@models/command-context";
import { injectable } from "inversify";
import { CommandResult } from "@models/command-result";

@injectable()
export class Ping extends Command {
    names = [ "ping", "p" ];
    description = "Pings the bot.";
    usageHint = process.env.PREFIX + "ping";

    async run(context: CommandContext): Promise<CommandResult> {
        try {
            const pingMessage = await context.originalMessage.channel.send("Checking...");
            await pingMessage.edit(`Pong! Latency is ${pingMessage.createdTimestamp - context.originalMessage.createdTimestamp}ms.`);
            return Promise.resolve(new CommandResult(this, context, true,  "Successfully ponged."));
        } catch(error) {
            return Promise.reject(new CommandResult(this, context, false, "Ping command failed.", error));
        }

    }
}