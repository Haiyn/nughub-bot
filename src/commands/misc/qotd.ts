import { Command } from '@commands/command';
import { QotdController } from '@controllers/qotd-controller';
import { CommandResult } from '@models/commands/command-result';
import { PermissionLevel } from '@models/permissions/permission-level';
import { MessageService } from '@services/message-service';
import { ScheduleService } from '@services/schedule-service';
import { JobRuntimeController } from '@src/controllers';
import { SessionMapper } from '@src/mappers';
import { CommandError, EmbedLevel, EmbedType, QuestionModel } from '@src/models';
import {
    ConfigurationProvider,
    EmbedProvider,
    EmojiProvider,
    StringProvider,
} from '@src/providers';
import { ChannelService, HelperService, InteractionService, UserService } from '@src/services';
import { TYPES } from '@src/types';
import { Client, CommandInteraction } from 'discord.js';
import { inject, injectable } from 'inversify';
import { Logger } from 'tslog';
import moment = require('moment');

@injectable()
export class Qotd extends Command {
    public permissionLevel: PermissionLevel = PermissionLevel.Member;
    private qotdController: QotdController;

    constructor(
        @inject(TYPES.CommandLogger) logger: Logger,
        @inject(TYPES.Client) client: Client,
        @inject(TYPES.ConfigurationProvider) configuration: ConfigurationProvider,
        @inject(TYPES.ChannelService) channelService: ChannelService,
        @inject(TYPES.HelperService) helperService: HelperService,
        @inject(TYPES.InteractionService) interactionService: InteractionService,
        @inject(TYPES.UserService) userService: UserService,
        @inject(TYPES.ScheduleService) scheduleService: ScheduleService,
        @inject(TYPES.MessageService) messageService: MessageService,
        @inject(TYPES.StringProvider) stringProvider: StringProvider,
        @inject(TYPES.EmbedProvider) embedProvider: EmbedProvider,
        @inject(TYPES.EmojiProvider) emojiProvider: EmojiProvider,
        @inject(TYPES.JobRuntimeController) jobRuntime: JobRuntimeController,
        @inject(TYPES.SessionMapper) sessionMapper: SessionMapper,
        @inject(TYPES.QotdController) qotdController: QotdController
    ) {
        super(
            logger,
            client,
            configuration,
            channelService,
            helperService,
            interactionService,
            userService,
            scheduleService,
            messageService,
            stringProvider,
            embedProvider,
            emojiProvider,
            jobRuntime,
            sessionMapper
        );
        this.qotdController = qotdController;
    }

    async run(interaction: CommandInteraction): Promise<CommandResult> {
        this.logger.info('Saving new question to database.');
        const question = new QuestionModel({
            content: interaction.options.getString('question'),
            dateAdded: moment().utc().toDate(),
            used: false,
            submitterId: interaction.member.user.id,
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
            await this.qotdController.scheduleQotd();
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
