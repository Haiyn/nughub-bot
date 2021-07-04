import { Message } from "discord.js";
import { Command } from "@src/commands";

export class CommandContext {
    readonly command: Command;
    readonly args: string[];
    readonly originalMessage: Message;

    constructor(
        command: Command,
        message: Message,
        args: string[]
    ) {
        this.command = command;
        this.args = args;
        this.originalMessage = message;
    }
}