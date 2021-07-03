import { Command } from "@commands/command";
import { CommandContext } from "@models/command-context";

export class Ping extends Command {
    names = ["ping", "p"];
    description = "Pings the bot.";
    usageHint = process.env.PREFIX + "ping";

    async run(context: CommandContext): Promise<void> {
        await context.originalMessage.reply("Pong!");
    }
}