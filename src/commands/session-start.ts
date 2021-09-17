import { injectable } from "inversify";
import { Channel, User } from "discord.js";
import { Command } from "@commands/command";
import { CommandContext } from "@models/command-context";
import { CommandResult } from "@models/command-result";
import { SessionModel } from "@models/session";

@injectable()
export class SessionStart extends Command {
    names = ["start"];
    description = "Starts an RP session in the given channel with the given turn order.";
    usageHint = "**Usage Hint:** \`" + process.env.PREFIX + "start #<channel name> @User1 @User2 ...\`";

    public async run(context: CommandContext): Promise<CommandResult> {
        this.logger.debug("Parsing arguments for start command...");
        const parsedArguments = await this.validateArguments(context.args);
        if(parsedArguments["errorMessage"]) {
            this.logger.debug("Arguments are malformed!");
            await context.originalMessage.reply(parsedArguments["errorMessage"] as string);
            return Promise.resolve(new CommandResult(this, context, false, "Input validation failed."));
        }
        this.logger.trace(`Parsed Arguments: ${JSON.stringify(parsedArguments)}`);

       this.logger.debug("Saving Session to database...");
        if(!await this.saveSessionToDatabase(parsedArguments)) {
            await context.originalMessage.reply("Uh-oh, something went wrong.");
            return Promise.reject(new CommandResult(this, context, false, "Failed to save to MongoDB."));
        }

        /* this.logger.debug("Saving Session to discord post...");
        if(!this.saveSessionToDiscordMessage(parsedArguments)) {
            await context.originalMessage.reply("Uh-oh, something went wrong.");
            return Promise.reject(new CommandResult(this, context, false, "Failed to create/edit session post."));
        } */

        await context.originalMessage.reply(`I successfully started a new RP session in <#${(parsedArguments["channel"] as Channel).id}>!`);
        return Promise.resolve(new CommandResult(this, context, true, "Successfully started new session."));
    }

    public validateArguments(args: string[]): Record<string, unknown> {
        this.logger.trace(`Arguments for start command: ${JSON.stringify(args)}`);
        if(args.length < 2) {
            return { "errorMessage": "Please provide all needed arguments!\n" + this.usageHint };
        }
        const result: Record<string, unknown> = {};

        const channel = this.channelService.getChannelByChannelId(args[0]);
        if(!channel) return { "errorMessage": "The channel you've provided is invalid! Does it really exist?" };
        result["channel"] = channel;

        let users = [];
        args.slice(1, args.length).forEach(arg => { users.push(this.userService.getUserByUserId(arg)); });
        if(users.length != args.length - 1) {
            this.logger.debug(`Expected to match ${args.length - 1} users from ${JSON.stringify(users)} but matched ${users.length}`);
            users = null;
        }
        if(!users || users.includes(undefined) || users.includes(null)) return { "errorMessage": "I couldn't find some of the users you provided. Are you sure they're correct?" };
        if(users.length == 1) return { "errorMessage": "You can't start an RP with just one person!" };
        result["users"] = users;

        return result;
    }

    private async saveSessionToDatabase(data: Record<string, unknown>): Promise<boolean> {
        const channelId = (data["channel"] as Channel).id;
        const userIds = [];
        (data["users"] as User[]).forEach(user => userIds.push(user.id));
        const session = new SessionModel({
            channel: channelId,
            order: userIds,
            currentTurn: userIds[0],
            active: true
        });
        this.logger.trace(session);

        try {
            const databaseResult = await session.save();
            this.logger.debug(`Saved one SessionModel to the database (ID: ${databaseResult._id}).`);
            return true;
        } catch(error) {
            this.logger.error("Failed to save SessionModel to database:", this.logger.prettyError(error));
            return false;
        }
    }

    private saveSessionToDiscordMessage(data: Record<string, unknown>): boolean {
        return false;
    }
}