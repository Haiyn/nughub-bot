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
    description = "Ends your turn on a given RP. Do it either in the RP channel or somewhere else and provide the channel name.";
    usageHint = "**Usage Hint:** \`" + process.env.PREFIX + `${this.names[0]} [optional message for next user]\``;

    async run(context: CommandContext): Promise<CommandResult> {
        this.logger.debug("Parsing arguments for next command...");
        const session: ISessionSchema = await SessionModel.findOne({ channel: context.originalMessage.channel.id }).exec();
        if(!session) {
            await context.originalMessage.reply("There is no ongoing RP in this channel! Please use this command in the RP channel where you want to notify the next user.");
            return Promise.resolve(new CommandResult(this, context, false, "No valid arguments for next command."));
        }

        await this.updateTurnAndNotifyNextUser(session, context.args.length !== 0 ? context.args.join(" ") : null);

        await context.originalMessage.delete();
        return Promise.resolve(new CommandResult(this, context, true, `Advanced the session turn for channel ID ${session.channelId}`));
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