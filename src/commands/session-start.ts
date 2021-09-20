import { injectable } from "inversify";
import { Channel, ColorResolvable, Message, MessageEmbed, TextChannel, User } from "discord.js";
import { Command } from "@commands/command";
import { Configuration } from "@models/configuration";
import { CommandContext } from "@models/command-context";
import { CommandResult } from "@models/command-result";
import { Session } from "@models/session";
import { SessionModel } from "@models/session-schema";
import container from "@src/inversify.config";
import { TYPES } from "@src/types";
import { Character } from "@models/character";
import { ICharacterSchema } from "@models/character-schema";

@injectable()
export class SessionStart extends Command {
    names = ["start"];
    description = "Starts an RP session in the given channel with the given turn order.";
    usageHint = "**Usage Hint:** \`" + `${this.names[0]} #<channel name> @User1 CharacterName1 @User2 CharacterName2 ...\``;
    permissionLevel = 1;

    public async run(context: CommandContext): Promise<CommandResult> {
        this.logger.debug("Parsing arguments for start command...");
        const parsedSession: Session | string = await this.validateArguments(context.args);
        if(typeof parsedSession === "string") {
            this.logger.debug("Arguments are malformed!");
            await context.originalMessage.reply(parsedSession);
            return Promise.resolve(new CommandResult(this, context, false, "Input validation failed."));
        }
        this.logger.trace(`Parsed Arguments: ${JSON.stringify(parsedSession)}`);

        this.logger.debug("Saving Session to discord post...");
        const sessionMessage = await this.saveSessionToSessionChannel(parsedSession);
        if(!sessionMessage) {
            await context.originalMessage.reply("Uh-oh, something went wrong while updating the current sessions post!");
            return Promise.reject(new CommandResult(this, context, false, "Failed to create/edit session post."));
        }
        parsedSession.sessionPost = sessionMessage;

        this.logger.debug("Saving Session to database...");
        if(!await this.saveSessionToDatabase(parsedSession)) {
            await context.originalMessage.reply("Uh-oh, something went wrong while saving the session!");
            await this.channelService.getTextChannelByChannelId(container.get<Configuration>(TYPES.Configuration).currentSessionsChannelId).messages.delete(parsedSession.sessionPost);
            return Promise.reject(new CommandResult(this, context, false, "Failed to save to MongoDB."));
        }

        await context.originalMessage.reply(`I successfully started a new RP session in <#${parsedSession.channel.id}>!`);
        return Promise.resolve(new CommandResult(this, context, true, "Successfully started new session."));
    }

    public async validateArguments(args: string[]): Promise<Session|string> {
        this.logger.trace(`Arguments for start command: ${JSON.stringify(args)}`);
        // Form
        if(args.length < 2) {
            return "Please provide all needed arguments!\n" + this.usageHint;
        }

        // Channel
        const channel = this.channelService.getTextChannelByChannelId(args[0]);
        if(!container.get<Configuration>(TYPES.Configuration).rpChannelIds.find(channelId => channelId == channel.id)) return "The channel you've provided is not a channel you can start a session in! Please pick a valid RP channel.";
        if(!channel) return "The channel you've provided is invalid! Does it really exist?";
        if(await SessionModel.findOne({ "channel": channel.id }).exec()) return "There is already a RP session running in this channel!";

        // Users & Names
        const names = [];
        let users: Array<User> = [];
        args.slice(1, args.length).forEach((argument, index) => {
            if(index % 2 == 0) users.push(this.userService.getUserByUserId(argument));
            else names.push(argument);
        });
        if(users.length != (args.length - 1) / 2) {
            this.logger.debug(`Expected to match ${args.length - 1} users from ${JSON.stringify(users)} but matched ${users.length}`);
            users = null;
        }
        if(names.length != (args.length - 1) / 2 || names.length != users.length) return "Please provide an character name for every person you mentioned!";
        if(!users || users.includes(undefined) || users.includes(null)) return "I couldn't find some of the users you provided. Are you sure they're correct?";
        if(users.length == 1) return "You can't start an RP with just one person!";
        const turnOrder: Array<Character> = [];
        users.forEach((user, index) => turnOrder.push(new Character(user, names[index])));

        return new Session(channel, turnOrder, users[0], null);
    }

    private async saveSessionToDatabase(data: Session): Promise<boolean> {
        const turnOrder: Array<ICharacterSchema> = [];
        data.turnOrder.forEach(character => {
            turnOrder.push({ userId: character.user.id, name: character.name });
        });

        const session = new SessionModel({
            channelId: data.channel.id,
            turnOrder: turnOrder,
            currentTurnId: turnOrder[0].userId, // first array element
            sessionPostId: data.sessionPost.id
        });

        this.logger.trace(`Saved following session to database: ${session}`);

        try {
            const databaseResult = await session.save();
            this.logger.debug(`Saved one SessionModel to the database (ID: ${databaseResult._id}).`);
            return true;
        } catch(error) {
            this.logger.error("Failed to save SessionModel to database:", this.logger.prettyError(error));
            return false;
        }
    }

    private async saveSessionToSessionChannel(data: Session): Promise<Message> {
        const configuration = container.get<Configuration>(TYPES.Configuration);
        const sessionsChannel = this.channelService.getTextChannelByChannelId(configuration.currentSessionsChannelId);

        // Check if sessions channel is ready for new message
        try {
            const initialized = await this.checkSessionsChannel(sessionsChannel);
            if(!initialized) {
                const success = SessionStart.initializeSessionsChannel(sessionsChannel);
                if (!success) {
                    this.logger.debug("Sessions channel could not be initialized.");
                    return Promise.resolve(null);
                }
                this.logger.debug("Sessions channel was initialized.");
            }
        } catch(error) {
            this.logger.debug("Sessions channel could not be initialized:", this.logger.prettyError(error));
            return Promise.resolve(null);
        }

        // Send new message
        try {
            let postContent = `\n\n<#${data.channel.id}>:\n`;
            data.turnOrder.forEach((character) => { postContent += `${character.name} <@${character.user.id}>\n`; });
            const divider = "\`\`\`⋟────────────────────────⋞\`\`\`";

            const result = await sessionsChannel.send({
                content: postContent + divider,
                "allowedMentions": { "parse" : []}
            });
            this.logger.debug(`Sent new sessions message (ID: ${result.id})`);
            return Promise.resolve(result);
        } catch(error) {
            this.logger.error("Failed to send new sessions message", this.logger.prettyError(error));
            return Promise.resolve(null);
        }
    }

    private async checkSessionsChannel(sessionsChannel: Channel): Promise<boolean> {
        if(!sessionsChannel.isText()) {
            return Promise.reject(new Error(`Channel for session channel ID ${sessionsChannel.id} is not a text channel.`));
        }

        const sessionsChannelMessages = await sessionsChannel.messages.fetch({ limit: 100 });
        if(sessionsChannelMessages.size != 0) { // Channel has messages in it
            let isOnlyBotMessages = true;
            sessionsChannelMessages.each((message) => {
                if(message.author.id !== this.client.user.id) {
                    isOnlyBotMessages = false;
                    return;
                }
            });
            if(!isOnlyBotMessages) {
                return Promise.reject(new Error(`Session Posts Channel has non-bot messages in it.`));
            }
            this.logger.debug(`Session channel is already initialized.`);
            return Promise.resolve(true);
        }
        this.logger.debug(`Session channel is not yet initialized.`);
        return Promise.resolve(false);

    }

    private static async initializeSessionsChannel(sessionsChannel: TextChannel): Promise<boolean> {
        const configuration = container.get<Configuration>(TYPES.Configuration);
        const embed = new MessageEmbed()
            .setColor(configuration.guildColor as ColorResolvable)
            .setAuthor(sessionsChannel.guild.name, sessionsChannel.guild.iconURL())
            .setFooter("(squeaks regally)")
            .setTitle("Ongoing RP Sessions")
            .setDescription("You can find all currently running RPs here - including their turn order.");
        const message = await sessionsChannel.send({ embeds: [embed]});
        if(!message) return Promise.resolve(false);
        return Promise.resolve(true);
    }
}