import { Command } from "@commands/command";
import { CommandContext } from "@models/command-context";
import { injectable } from "inversify";
import { CommandResult } from "@models/command-result";
import { ISessionSchema, SessionModel } from "@models/session-schema";
import container from "@src/inversify.config";
import { Configuration } from "@models/configuration";
import { TYPES } from "@src/types";
import { TextChannel } from "discord.js";
import { ICharacterSchema } from "@models/character-schema";

@injectable()
export class SessionNext extends Command {
    names = [ "next", "n" ];
    description = "Ends your turn on a given RP. Use it in the corresponding RP channel.";
    usageHint = "**Usage Hint:** \`" + process.env.PREFIX + `${this.names[0]} [#<channel name>] [optional message for next user]\``;

    async run(context: CommandContext): Promise<CommandResult> {
        this.logger.debug("Parsing arguments for next command...");
        const session: ISessionSchema = await this.validateArguments(context.args, context);
        if(!session) {
            const response = await context.originalMessage.reply("There is no ongoing RP in this channel! Please use this command in the RP channel where you want to notify the next user or pass the channel as an argument.\n" + this.usageHint);
            if(this.channelService.isRpChannel(context.originalMessage.channel.id)) await this.messageService.deleteMessages([ context.originalMessage, response ], 10000);
            return Promise.resolve(new CommandResult(this, context, false, "Next command used in an invalid channel."));
        }
        if(context.originalMessage.author.id !== session.currentTurnId) {
            const response = await context.originalMessage.reply({
                content: `It's currently <@${session.currentTurnId}>'s turn! You can only use this command if it's your turn.`,
                allowedMentions: { "parse": []}
            });
            if(this.channelService.isRpChannel(context.originalMessage.channel.id)) await this.messageService.deleteMessages([ context.originalMessage, response ], 10000);
            return Promise.resolve(new CommandResult(this, context, false, "Next command used by invalid user."));
        }

        let userMessage = null;
        if(this.helperService.isDiscordId(context.args[0]) && context.args.length > 1) userMessage = context.args.slice(1).join(" ");
        else userMessage = context.args.join(" ");
        await this.updateTurnAndNotifyNextUser(session, userMessage);

        await this.messageService.deleteMessages([context.originalMessage]);
        return Promise.resolve(new CommandResult(this, context, true, `Advanced the session turn for channel ID ${session.channelId}`));
    }

    public async validateArguments(args: string[], context?: CommandContext): Promise<ISessionSchema> {
        let channelId = null;
        if(args.length > 0 && this.helperService.isDiscordId(args[0])) channelId = this.channelService.getTextChannelByChannelId(args[0])?.id;
        if(!channelId) channelId = context.originalMessage.channel.id;
        return Promise.resolve(await SessionModel.findOne({ channel: channelId }).exec());
    }

    private async updateTurnAndNotifyNextUser(session: ISessionSchema, userMessage?: string): Promise<boolean> {
        // Iterate current turn
        this.logger.debug(`CurrentTurn: ${session}`);
        const nextTurn: ICharacterSchema = this.iterateTurn(session.turnOrder, session.currentTurnId);

        this.logger.trace(`Current session: ${JSON.stringify(session)}\nNext currentTurn will be: ${nextTurn.userId} - ${nextTurn.name}`);
        const doc: ISessionSchema = await SessionModel.findOneAndUpdate({ channel: session.channelId }, { currentTurnId: nextTurn.userId }, { new: true });
        this.logger.debug(`Updated next user for session: ${doc.currentTurnId}`);

        // Send notification
        let messageContent = `<@${nextTurn.userId}> (${nextTurn.name}) in <#${session.channelId}>`;
        if(userMessage) messageContent += `\n<@${session.currentTurnId}> said: \"${userMessage}\"`;
        const notificationChannel: TextChannel = await this.channelService.getTextChannelByChannelId(container.get<Configuration>(TYPES.Configuration).notificationChannelId);
        await notificationChannel.send({
            content: messageContent,
            allowedMentions: { "users":[nextTurn.userId]},
        });

        this.logger.debug(`Notified next user (ID: ${nextTurn.userId}) in notification channel.`);
        return Promise.resolve(true);
    }

    private iterateTurn(turnOrder: Array<ICharacterSchema>, currentTurnId: string): ICharacterSchema {
        let nextTurn: ICharacterSchema = null;
        let index = 0;

        turnOrder.forEach((character) => {
            if(character.userId === currentTurnId) {
                if(index == turnOrder.length - 1) {
                    // If current turn is the last element, next turn is the first element
                    this.logger.debug(`Last item in array (${index+1} with array length ${turnOrder.length}.`);
                    nextTurn = turnOrder[0];
                    return;
                }
                this.logger.debug(`Next item in array (${index+1} with array length ${turnOrder.length} is ${turnOrder[index+1]}.`);
                index++;
                nextTurn = turnOrder[index];
                return;
            }
            index++;
        });
        return nextTurn;
    }

}