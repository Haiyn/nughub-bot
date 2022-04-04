import { FeatureService } from '@services/feature/feature-service';
import { ConfigurationKeys, EmbedLevel, EmbedType, QuestionModel } from '@src/models';
import { injectable } from 'inversify';
import moment = require('moment');

/** Handles different functions for questions of the day */
@injectable()
export class QotdService extends FeatureService {
    public async sendQotd(): Promise<void> {
        // Get the oldest qotd
        const questions = await QuestionModel.find({ used: false }).sort({ dateAdded: 1 }).exec();

        if (!questions || questions.length === 0 || questions[0] === undefined) {
            this.logger.info(`No QOTDs left.`);
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
    }
}
