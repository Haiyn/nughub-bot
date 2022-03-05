import { Controller } from '@controllers/controller';
import { MessageService } from '@services/message-service';
import { ScheduleService } from '@services/schedule-service';
import { ConfigurationKeys, EmbedLevel, EmbedType, QuestionModel } from '@src/models';
import { ConfigurationProvider, EmbedProvider, PermissionProvider } from '@src/providers';
import { ChannelService, UserService } from '@src/services';
import { TYPES } from '@src/types';
import { Client } from 'discord.js';
import { inject, injectable } from 'inversify';
import { Logger } from 'tslog';
import moment = require('moment');

@injectable()
export class QotdController extends Controller {
    private readonly channelService: ChannelService;
    private readonly scheduleService: ScheduleService;
    private readonly messageService: MessageService;
    private readonly userService: UserService;

    constructor(
        @inject(TYPES.ChannelService) channelService: ChannelService,
        @inject(TYPES.ScheduleService) scheduleService: ScheduleService,
        @inject(TYPES.MessageService) messageService: MessageService,
        @inject(TYPES.UserService) userService: UserService,
        @inject(TYPES.BaseLogger) logger: Logger,
        @inject(TYPES.Client) client: Client,
        @inject(TYPES.GuildId) guildId: string,
        @inject(TYPES.Token) token: string,
        @inject(TYPES.ConfigurationProvider) configuration: ConfigurationProvider,
        @inject(TYPES.EmbedProvider) embedProvider: EmbedProvider,
        @inject(TYPES.PermissionProvider) permissionProvider: PermissionProvider
    ) {
        super(logger, guildId, token, client, configuration, embedProvider, permissionProvider);
        this.channelService = channelService;
        this.scheduleService = scheduleService;
        this.messageService = messageService;
        this.userService = userService;
    }

    /**
     * Schedules a qotd at the next possible time
     *
     * @returns when done
     */
    public async scheduleQotd(): Promise<void> {
        const sendQotd = async (): Promise<void> => {
            // Get the oldest qotd
            const questions = await QuestionModel.find({ used: false })
                .sort({ dateAdded: 1 })
                .exec();

            if (!questions || questions.length === 0 || questions[0] === undefined) {
                this.logger.warn(`Trying to schedule a qotd but there are none left!`);
                return;
            }

            // Construct and send message
            const submitter = await this.userService.getUserById(questions[0].submitterId);
            const qotdEmbed = await this.embedProvider.get(EmbedType.Detailed, EmbedLevel.Guild, {
                title: `❔❓ Question of the Day (${moment.utc().format('dddd, MMMM Do YYYY')})`,
                content: questions[0].content,
                footer: `Submitted by ${
                    submitter.username
                } • Submit your own with the /qotd command! • ${questions.length - 1} left`,
            });
            const qotdChannel = this.channelService.getTextChannelByChannelId(
                await this.configuration.getString(ConfigurationKeys.Channels_QotdChannelId)
            );

            await qotdChannel.send({ embeds: [qotdEmbed] });
            this.logger.info(`Sent new qotd.`);

            // Set current question to used
            questions[0].used = true;
            await questions[0].save();
            this.logger.debug(`Updated used qotd.`);

            // Schedule new qotd message
            if (questions.length > 1) {
                this.logger.debug(`${questions.length - 1} qotds left: Scheduling new qotd.`);
                await this.scheduleQotd();
            }
        };

        const date = await this.findNextQotdDay();

        // Schedule the job
        this.scheduleService.scheduleJob('qotd', date, sendQotd);
    }

    /**
     * Tries to restore a qotd job on startup of the bot
     *
     * @returns the amount of qotds left
     */
    public async restoreQotdJobs(): Promise<number> {
        const remainingQotds = await QuestionModel.find({ used: false }).exec();
        if (remainingQotds.length > 0) {
            await this.scheduleQotd();
        }
        return remainingQotds.length - 1;
    }

    /**
     * Gets the next possible time (day) for the next qotd
     *
     * @returns the next possible date
     */
    private async findNextQotdDay(): Promise<Date> {
        const hours = await this.configuration.getNumber(
            ConfigurationKeys.Schedule_QotdSendTime_Hours
        );
        const date = moment().utc().set('hours', hours).set('minutes', 0).set('seconds', 0);

        if (moment().utc().hours() >= hours) {
            // If we are already past the configured hour mark, set it for the next day instead
            this.logger.debug(
                `We are already past ${hours}, adding one day to move qotd to tomorrow.`
            );
            date.add(1, 'days');
        }

        return date.toDate();
    }
}
