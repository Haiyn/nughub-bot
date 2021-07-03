import { Command } from "@commands/command";
import { CommandContext } from "@models/command-context";
import {TYPES} from "@src/types";
import {Client} from "discord.js";
import {inject, injectable} from "inversify";

@injectable()
export class Ping extends Command {
    names = ["ping", "p"];
    description = "Pings the bot.";
    usageHint = process.env.PREFIX + "ping";

    async run(context: CommandContext): Promise<void> {
        const pingMessage = await context.originalMessage.channel.send("Checking...");
        await pingMessage.edit(`Pong! Latency is ${pingMessage.createdTimestamp - context.originalMessage.createdTimestamp}ms.`);
    }
}