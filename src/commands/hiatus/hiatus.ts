import { Command } from '@commands/command';
import { CommandResult } from '@models/commands/command-result';
import { Hiatus as HiatusData } from '@models/jobs/hiatus';
import { HiatusModel } from '@models/jobs/hiatus-schema';
import { PermissionLevel } from '@models/permissions/permission-level';
import {
    CommandError,
    CommandValidationError,
    EmbedLevel,
    EmbedType,
    ISessionSchema,
    SessionModel,
} from '@src/models';
import { CommandInteraction, CommandInteractionOptionResolver } from 'discord.js';
import { injectable } from 'inversify';
import moment = require('moment');

@injectable()
export class Hiatus extends Command {
    public permissionLevel: PermissionLevel = PermissionLevel.Member;

    async run(interaction: CommandInteraction): Promise<CommandResult> {
        const subcommand = interaction.options.getSubcommand();
        this.logger.debug(`Matching subcommand for ${interaction.commandName}: ${subcommand}`);
        switch (subcommand) {
            case 'create':
                await this.create(interaction);
                break;
            default:
                throw new CommandError(
                    `No subcommand mapping for strings subcommand ${subcommand}`
                );
        }

        return {
            executed: true,
            message: 'Successfully executed hiatus subcommand.',
        };
    }

    async validateOptions(options: CommandInteractionOptionResolver): Promise<void> {
        const reason = options.getString('reason');
        if (reason?.length > 3500) {
            throw new CommandValidationError(
                `User provided a hiatus reason longer than 3500 characters.`,
                await this.stringProvider.get('COMMAND.HIATUS.VALIDATION.REASON-TOO-LONG')
            );
        }

        const dateString = options.getString('until');
        if (!dateString) return;
        const date = Date.parse(dateString);
        if (!date) {
            throw new CommandValidationError(
                `User provided an invalid date format: ${dateString}.`,
                await this.stringProvider.get('COMMAND.HIATUS.VALIDATION.INVALID-DATE')
            );
        }

        if (moment().isAfter(date)) {
            throw new CommandValidationError(
                `User provided a date that is in the past: ${dateString}.`,
                await this.stringProvider.get('COMMAND.HIATUS.VALIDATION.DATE-IN-PAST')
            );
        }
    }

    /**
     * Runs the create subcommand
     *
     * @param interaction the interaction
     * @returns when done
     */
    public async create(interaction: CommandInteraction): Promise<void> {
        const activeHiatus = await HiatusModel.findOne({
            userId: interaction.member.user.id,
        }).exec();
        if (activeHiatus) {
            throw new CommandValidationError(
                `User tried to start another hiatus when one is still active.`,
                await this.stringProvider.get('COMMAND.HIATUS.VALIDATION.HIATUS-ALREADY-ACTIVE')
            );
        }

        const hiatus: HiatusData = {
            user: await this.userService.getUserById(interaction.member.user.id),
            reason: interaction.options.getString('reason'),
            expires: moment.utc(interaction.options.getString('until')).unix() + 12 * 60 * 60,
        };

        const currentTurnsForUser: ISessionSchema[] = await SessionModel.find({
            'currentTurn.userId': hiatus.user.id,
        });

        this.logger.debug(
            `Adjusting ${currentTurnsForUser.length} reminders to accommodate hiatus...`
        );
        for (const session of currentTurnsForUser) {
            await this.rescheduleReminder(session.channelId);
            await this.editTimestamp(hiatus, session.channelId);
        }

        this.logger.debug(`Sending hiatus to hiatus channel...`);
        hiatus.hiatusPostId = await this.messageService.sendHiatus(hiatus);

        this.logger.debug(`Saving hiatus to database...`);
        await this.saveHiatusToDatabase(hiatus);

        const embed = await this.embedProvider.get(EmbedType.Minimal, EmbedLevel.Success, {
            content: await this.stringProvider.get('COMMAND.HIATUS.SUCCESS'),
        });
        await this.interactionService.reply(interaction, { embeds: [embed] });
    }

    /**
     * Reschedules an active reminder for a user when a hiatus is created
     *
     * @param channelId The channelId for which the reminder should be reschedules
     * @returns when done
     */
    private async rescheduleReminder(channelId: string): Promise<void> {
        const name = `reminder:${channelId}`;
        // workaround for shitty node-schedule return: typed as Date but returns cron date without time accuracy
        const invocation = this.scheduleService.getJob(name)?.nextInvocation();
        const date = new Date(invocation);
        if (!date) {
            throw new CommandError(`Tried to get nonexistent job ${name}.`);
        }
        // add the the time to the date
        const newDate = moment(date)
            .add(await this.configuration.getNumber('Schedule_Hiatus_Hours'), 'hours')
            .add(await this.configuration.getNumber('Schedule_Hiatus_Minutes'), 'minutes')
            .toDate();
        this.logger.trace(`Found next invocation for ${channelId} on ${date}. Moved to ${newDate}`);

        this.scheduleService.rescheduleJob(name, newDate);
    }

    /**
     * Edits a timestamp with the new hiatus status
     *
     * @param hiatus the created hiatus
     * @param channelId the channelId for which the timestamp should be edited
     * @returns when done
     */
    private async editTimestamp(hiatus: HiatusData, channelId: string): Promise<void> {
        let timestampFooter = await this.userService.getUserHiatusStatus(hiatus.user.id);
        hiatus.expires
            ? (timestampFooter += ` expires <t:${hiatus.expires}:D> (<t:${hiatus.expires}:R>)`)
            : '';
        await this.messageService.editTimestamp(channelId, undefined, undefined, timestampFooter);
    }

    /**
     * Saves a created hiatus to the database
     *
     * @param hiatus the hiatus to save
     * @returns when done
     * @throws CommandError when saving failed
     */
    private async saveHiatusToDatabase(hiatus: HiatusData): Promise<void> {
        const hiatusModel = new HiatusModel({
            userId: hiatus.user.id,
            reason: hiatus.reason,
            hiatusPostId: hiatus.hiatusPostId,
        });
        if (hiatus.expires) hiatusModel.expires = hiatus.expires;

        try {
            const result = await hiatusModel.save();
            this.logger.debug(`Saved one HiatusModel to the database (ID: ${result.id}.`);
        } catch (error) {
            throw new CommandError(
                `Failed to save hiatus to database.`,
                `Something went wrong while I tried to save the hiatus.`,
                error
            );
        }
    }
}
