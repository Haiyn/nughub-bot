import { injectable } from "inversify";
import { Message } from "discord.js";
import { Command } from "@commands/command";
import { Configuration } from "@models/configuration";
import { CommandContext } from "@models/command-context";
import { CommandResult } from "@models/command-result";
import { Session, SessionModel } from "@models/session";
import container from "@src/inversify.config";
import { TYPES } from "@src/types";

@injectable()
export class SessionStart extends Command {
    names = ["start"];
    description = "Starts an RP session in the given channel with the given turn order.";
    usageHint = "**Usage Hint:** \`" + process.env.PREFIX + "start #<channel name> @User1 @User2 ...\`";

    public async run(context: CommandContext): Promise<CommandResult> {
        this.logger.debug("Parsing arguments for start command...");
        const parsedSession: Session | string = await this.validateArguments(context.args);
        if(typeof parsedSession === "string") {
            this.logger.debug("Arguments are malformed!");
            await context.originalMessage.reply(parsedSession);
            return Promise.resolve(new CommandResult(this, context, false, "Input validation failed."));
        }
        this.logger.trace(`Parsed Arguments: ${JSON.stringify(parsedSession)}`);

       this.logger.debug("Saving Session to database...");
        if(!await this.saveSessionToDatabase(parsedSession)) {
            await context.originalMessage.reply("Uh-oh, something went wrong while saving the session!");
            return Promise.reject(new CommandResult(this, context, false, "Failed to save to MongoDB."));
        }

        this.logger.debug("Saving Session to discord post...");
        if(!await this.saveSessionToSessionPost(parsedSession)) {
            await context.originalMessage.reply("Uh-oh, something went wrong while updating the current sessions post!");
            return Promise.reject(new CommandResult(this, context, false, "Failed to create/edit session post."));
        }

        await context.originalMessage.reply(`I successfully started a new RP session in <#${parsedSession.channel.id}>!`);
        return Promise.resolve(new CommandResult(this, context, true, "Successfully started new session."));
    }

    public validateArguments(args: string[]): Session|string {
        this.logger.trace(`Arguments for start command: ${JSON.stringify(args)}`);
        if(args.length < 2) {
            return "Please provide all needed arguments!\n" + this.usageHint;
        }

        // TODO: Check if already session ongoing in channel
        // TODO: Check if given channel is an RP channel (use config for designating valid RP channels)
        const channel = this.channelService.getTextChannelByChannelId(args[0]);
        if(!channel) return "The channel you've provided is invalid! Does it really exist?";

        // TODO: Check if users duplicate
        let users = [];
        args.slice(1, args.length).forEach(arg => { users.push(this.userService.getUserByUserId(arg)); });
        if(users.length != args.length - 1) {
            this.logger.debug(`Expected to match ${args.length - 1} users from ${JSON.stringify(users)} but matched ${users.length}`);
            users = null;
        }
        if(!users || users.includes(undefined) || users.includes(null)) return "I couldn't find some of the users you provided. Are you sure they're correct?";
        if(users.length == 1) return "You can't start an RP with just one person!";

        return new Session(channel, users, users[0], true);
    }

    private async saveSessionToDatabase(data: Session): Promise<boolean> {
        const channelId = data.channel.id;
        const userIds = [];
        data.order.forEach(user => userIds.push(user.id));
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

    private async saveSessionToSessionPost(data: Session): Promise<boolean> {
        const configuration = container.get<Configuration>(TYPES.Configuration);
        let sessionPost: Message;

        if(!configuration.sessionPostId) {
            sessionPost = await this.createSessionPost(configuration.currentSessionsChannelId);
            if(!sessionPost) return Promise.resolve(false);
            // TODO: Rework configuration after all, result is immutable. Save to db?
            // container.get<Configuration>(TYPES.Configuration).sessionPostId = sessionPost.id;
        }

        try {
            // TODO: Send separate messages for each turn order (send then edit in ids to avoid pings)
            let newContent = `\n\n<#${data.channel.id}>:\n`;
            // TODO: How do I map the RP charas to the user???
            data.order.forEach(user => { newContent += `<@${user.id}>\n`; });
            await sessionPost.edit(sessionPost.content += newContent);
        } catch(error) {
            this.logger.error(`Could not edit current session post (ID: ${sessionPost.id})`, this.logger.prettyError(error));
            return Promise.resolve(false);
        }
        this.logger.debug(`Successfully updated current session post (ID: ${sessionPost.id})`);
        return Promise.resolve(true);
    }

    // TODO: Maybe just use the whole channel instead of a message, then you can clear it in the beginning
    private async createSessionPost(channelId: string): Promise<Message> {
        let sessionPost;
        const currentSessionsChannel = this.channelService.getTextChannelByChannelId(channelId);
        if(currentSessionsChannel.isText()) {
            // TODO: Use Embed instead of plaintext message?
            sessionPost = await currentSessionsChannel.send("**Current ongoing RP Sessions:**");
            this.logger.debug(`Created new current session post with ID ${sessionPost.id}.`);
        } else {
            this.logger.error(`currentSessionsChannelId ${channelId} does not point to a text channel!`);
            sessionPost = null;
        }
        return Promise.resolve(sessionPost);
    }
}