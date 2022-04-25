import { Command } from '@commands/command';
import { CommandResult } from '@models/commands/command-result';
import { PermissionLevel } from '@models/permissions/permission-level';
import { CommandError, EmbedLevel, EmbedType, QuestionModel } from '@src/models';
import { CommandInteraction } from 'discord.js';
import { injectable } from 'inversify';
import moment = require('moment');

@injectable()
export class Qotd extends Command {
    public permissionLevel: PermissionLevel = PermissionLevel.Member;

    async run(interaction: CommandInteraction): Promise<CommandResult> {
        this.logger.info('Saving new question to database.');
        const question = new QuestionModel({
            content: interaction.options.getString('question'),
            dateAdded: moment().utc().toDate(),
            used: false,
            submitterId: interaction.member?.user?.id,
        });

        try {
            await question.save();
        } catch (error) {
            throw new CommandError(
                `Failed internally while saving question to database.`,
                await this.stringProvider.get('SYSTEM.ERROR.INTERNAL.MONGOOSE-REJECT'),
                error
            );
        }

        const remainingQotds = await QuestionModel.find({ used: false }).exec();
        if (remainingQotds.length === 1) {
            // The one we just added is the newest one, schedule them again
            this.logger.debug(
                `New qotd added. There are now at least one qotd again, scheduling...`
            );
        }

        const reply = await this.embedProvider.get(EmbedType.Minimal, EmbedLevel.Success, {
            content: await this.stringProvider.get('COMMAND.QOTD.SUCCESS'),
        });
        await this.interactionService.reply(interaction, { embeds: [reply] });

        return {
            executed: true,
            message: `Inserted one new question model.`,
        };
    }

    async validateOptions(): Promise<void> {
        return;
    }
}
