import { inject, injectable } from "inversify";
import { Client } from "discord.js";
import { Logger } from "tslog";
import { TYPES } from "@src/types";
import { CommandContext } from "@models/command-context";
import { CommandResult } from "@models/command-result";
import { ChannelService, UserService } from "@services/index";

export interface ICommand {
    readonly names: string[]
    readonly description: string;
    readonly usageHint: string;
    readonly permissionLevel: number;
    readonly logger: Logger;

    getHelpMessage(): string;
    run(context: CommandContext): Promise<CommandResult>;
}

@injectable()
export class Command implements ICommand {
    readonly names: string[]
    readonly description: string;
    readonly usageHint: string;
    readonly permissionLevel: number = 0;

    readonly logger: Logger;
    readonly client: Client;
    readonly channelService: ChannelService;
    readonly userService: UserService;

    constructor(
        @inject(TYPES.CommandLogger) logger: Logger,
        @inject(TYPES.Client) client: Client,
        @inject(TYPES.ChannelService) channelService: ChannelService,
        @inject(TYPES.UserService) userService: UserService
    ) {
        this.logger = logger;
        this.client = client;
        this.channelService = channelService;
        this.userService = userService;
    }

    public getHelpMessage(): string {
        return this.description + "\n" + "Usage: '" + this.usageHint + "'";
    }

    public run(context: CommandContext): Promise<CommandResult> {
        return Promise.resolve(new CommandResult(this, context, false, "not implemented."));
    }

    public validateArguments(args: string[]): unknown|string {
        return args;
    }
}