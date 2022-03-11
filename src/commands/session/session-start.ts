import { Command } from '@commands/command';
import { CommandError } from '@models/commands/command-error';
import { CommandResult } from '@models/commands/command-result';
import { CommandValidationError } from '@models/commands/command-validation-error';
import { Character } from '@models/data/character';
import { ICharacterSchema } from '@models/data/character-schema';
import { Session } from '@models/data/session';
import { SessionModel } from '@models/data/session-schema';
import { PermissionLevel } from '@models/permissions/permission-level';
import { EmbedLevel } from '@models/ui/embed-level';
import { EmbedType } from '@models/ui/embed-type';
import { ConfigurationKeys, HiatusModel } from '@src/models';
import {
    Channel,
    CommandInteraction,
    CommandInteractionOptionResolver,
    Message,
    TextChannel,
} from 'discord.js';
import { injectable } from 'inversify';

@injectable()
export class SessionStart extends Command {
    public permissionLevel: PermissionLevel = PermissionLevel.Moderator;

    async run(interaction: CommandInteraction): Promise<CommandResult> {
        this.logger.debug('Parsing session...');
        const sessionToSave = await this.parseSession(interaction.options);
        const sessionsChannel = await this.channelService.getTextChannelByChannelId(
            await this.configuration.getString('Channels_CurrentSessionsChannelId')
        );

        this.logger.debug('Checking session channel...');
        const initialized = await this.checkSessionsChannel(sessionsChannel);
        if (!initialized) {
            this.logger.debug('Initializing sessions channel...');
            await this.initializeSessionsChannel(sessionsChannel);
        }

        this.logger.debug('Saving Session to session channel...');
        await this.saveSessionToSessionChannel(sessionsChannel, sessionToSave).then((result) => {
            sessionToSave.sessionPost = result;
        });

        this.logger.debug('Saving Session to database...');
        await this.saveSessionToDatabase(sessionToSave);

        this.logger.debug('Sending Timestamp...');
        await this.messageService.sendTimestamp(sessionToSave);

        const embedReply = await this.embedProvider.get(EmbedType.Minimal, EmbedLevel.Success, {
            content: await this.stringProvider.get('COMMAND.SESSION-START.SUCCESS', [
                sessionToSave.channel.id,
            ]),
        });
        await this.interactionService.reply(interaction, {
            embeds: [embedReply],
        });
        return Promise.resolve({
            executed: true,
            message: `Successfully started new session.`,
        });
    }

    public async validateOptions(options: CommandInteractionOptionResolver): Promise<void> {
        // Channel
        const channel = this.channelService.getTextChannelByChannelId(
            options.getChannel('channel').id
        );
        if (!(await this.configuration.isInSet('Channels_RpChannelIds', channel.id))) {
            throw new CommandValidationError(
                `User provided channel that isn't in permitted RP channels list.`,
                await this.stringProvider.get(
                    'COMMAND.SESSION-START.VALIDATION.INVALID-RP-CHANNEL',
                    [channel.id]
                )
            );
        }

        if (await SessionModel.findOne({ channelId: channel.id }).exec()) {
            throw new CommandValidationError(
                `User provided channel that already has an active RP.`,
                await this.stringProvider.get(
                    'COMMAND.SESSION-START.VALIDATION.CHANNEL-ALREADY-USED',
                    [channel.id]
                )
            );
        }

        // Characters
        const users = [],
            characterNames = [];
        for (let i = 1; i <= 10; i++) {
            const user = options.getUser(`user${i}`);
            if (!user) break;
            users.push(user);
        }

        for (let i = 1; i <= 10; i++) {
            const character = options.getString(`character${i}`);
            if (!character) break;
            characterNames.push(character);
        }

        if (users.length != characterNames.length) {
            this.logger.debug(
                `Uneven numbers of users and characters. ${users.length} != ${characterNames.length}`
            );
            throw new CommandValidationError(
                `User provided uneven amounts of users and characters.`,
                users.length > characterNames.length
                    ? await this.stringProvider.get(
                          'COMMAND.SESSION-START.VALIDATION.CHARACTER-NAME-NOT-PROVIDED'
                      )
                    : await this.stringProvider.get(
                          'COMMAND.SESSION-START.VALIDATION.USER-NOT-PROVIDED'
                      )
            );
        }

        let duplicate = false;
        const namesSoFar: Array<string> = [];
        for (let i = 0; i < characterNames.length; ++i) {
            const name = characterNames[i];
            if (namesSoFar.indexOf(name) != -1) {
                duplicate = true;
            }
            namesSoFar.push(name);
        }
        if (duplicate)
            throw new CommandValidationError(
                `User provided the same character name more than once.`,
                await this.stringProvider.get(
                    'COMMAND.SESSION-START.VALIDATION.DUPLICATE-CHARACTER-NAME'
                )
            );
    }

    /**
     * Parses the session business object from all the given command options
     *
     * @param options The command options given by the user
     * @returns The parsed session
     * @throws {CommandError} Throws if options could not be parsed
     */
    private async parseSession(options: CommandInteractionOptionResolver): Promise<Session> {
        try {
            const channel = this.channelService.getTextChannelByChannelId(
                options.getChannel('channel').id
            );
            const turnOrder: Array<Character> = [];
            for (let i = 1; i <= 10; i++) {
                if (!options.getUser(`user${i}`)) break;
                turnOrder.push({
                    user: options.getUser(`user${i}`),
                    name: options.getString(`character${i}`),
                });
            }

            return Promise.resolve({
                channel: channel,
                turnOrder: turnOrder,
                currentTurn: turnOrder[0],
                sessionPost: null,
            });
        } catch (error) {
            throw new CommandError(
                `Failed internally while parsing session.`,
                await this.stringProvider.get('COMMAND.SESSION-START.ERROR.PARSE-SESSION-FAILED'),
                error
            );
        }
    }

    /**
     * Saves the parsed session to a new message in the sessions channel
     *
     * @param channel The channel where the message is supposed to go
     * @param session The session business object
     * @returns Resolves with the sent message
     * @throws {CommandError} Throws if the message could not be sent
     */
    private async saveSessionToSessionChannel(
        channel: TextChannel,
        session: Session
    ): Promise<Message> {
        try {
            // Find out which game the channel is in
            let title = '';
            const category = session.channel.parent.name;
            switch (category) {
                case await this.configuration.getString(ConfigurationKeys.Category_Origins):
                    title += title += (await this.emojiProvider.get('DAO')) + ' ';
                    break;
                case await this.configuration.getString(ConfigurationKeys.Category_DA2):
                    title += title += (await this.emojiProvider.get('DA2')) + ' ';
                    break;
                case await this.configuration.getString(ConfigurationKeys.Category_Inquisition):
                    title += title += (await this.emojiProvider.get('DAI')) + ' ';
                    break;
                default:
                    this.logger.warn(`Unable to resolve emoji for category ${category}.`);
            }

            // Capitalize the channel name
            const channelNameWords = session.channel.name.split('-');
            channelNameWords.map(
                (name, index) =>
                    (channelNameWords[index] = name.charAt(0).toUpperCase() + name.slice(1))
            );
            title += ' ';
            title += channelNameWords.join(' ');

            let content = `${session.channel}\n\n\n`;
            for (const character of session.turnOrder) {
                if (
                    character.user.id === session.currentTurn.user.id &&
                    character.name === session.currentTurn.name
                )
                    content += ':arrow_right: ';
                content += `**${character.name}** - ${character.user.username} (${character.user}) `;

                const hasHiatus = await HiatusModel.findOne({ userId: character.user.id }).exec();
                if (hasHiatus) {
                    content += '⌛';
                }
                content += '\n\n';
            }

            const embed = await this.embedProvider.get(EmbedType.Detailed, EmbedLevel.Guild, {
                title: title,
                content: content,
            });

            const result = await channel.send({
                embeds: [embed],
                allowedMentions: { parse: [] },
            });
            this.logger.debug(`Sent new sessions message (ID: ${result.id})`);
            return Promise.resolve(result);
        } catch (error) {
            throw new CommandError(
                `Failed internally while saving to session channel.`,
                await this.stringProvider.get(
                    'COMMAND.SESSION-START.ERROR.SAVE-TO-SESSION-CHANNEL-FAILED'
                ),
                error
            );
        }
    }

    /**
     * Checks if the sessions channel is already initialized as one
     *
     * @param sessionsChannel The channel to check
     * @returns Whether the channel is initialized or not
     * @throws {CommandError} Throws if the channel cannot be initialized because it' invalid
     */
    private async checkSessionsChannel(sessionsChannel: Channel): Promise<boolean> {
        if (!sessionsChannel.isText()) {
            return Promise.reject(
                new Error(
                    `Channel for session channel ID ${sessionsChannel.id} is not a text channel.`
                )
            );
        }

        const sessionsChannelMessages = await sessionsChannel.messages.fetch({
            limit: 100,
        });
        if (sessionsChannelMessages.size != 0) {
            // Channel has messages in it
            this.logger.debug(`Session channel is already initialized.`);
            return Promise.resolve(true);
        }
        this.logger.debug(`Session channel is not yet initialized.`);
        return Promise.resolve(false);
    }

    /**
     * Initializes the session channel with an info message
     *
     * @param sessionsChannel The channel to initialize
     * @returns Resolves when message sent
     * @throws {CommandError} Throws if message cannot be sent
     */
    private async initializeSessionsChannel(sessionsChannel: TextChannel): Promise<void> {
        const embed = await this.embedProvider.get(EmbedType.Detailed, EmbedLevel.Guild, {
            title: await this.stringProvider.get('COMMAND.SESSION-START.INITIALIZE.EMBED-TITLE'),
            content: await this.stringProvider.get(
                'COMMAND.SESSION-START.INITIALIZE.EMBED-DESCRIPTION'
            ),
            authorName: sessionsChannel.guild.name,
            authorIcon: sessionsChannel.guild.iconURL(),
            footer: await this.stringProvider.get('COMMAND.SESSION-START.INITIALIZE.EMBED-FOOTER'),
        });

        const message = await sessionsChannel.send({ embeds: [embed] });
        if (!message)
            throw new CommandError(
                'Sessions channel could not be initialized.',
                await this.stringProvider.get('COMMAND.SESSION-START.ERROR.INITIALIZE-FAILED')
            );
        return Promise.resolve();
    }

    /**
     * Saves the new session to the database
     *
     * @param data The session data to save
     * @returns Resolves when session is saved
     * @throws {CommandError} Throws when saving failed
     */
    private async saveSessionToDatabase(data: Session): Promise<void> {
        const turnOrder: Array<ICharacterSchema> = [];
        data.turnOrder.forEach((character) => {
            turnOrder.push({ userId: character.user.id, name: character.name });
        });

        const session = new SessionModel({
            channelId: data.channel.id,
            turnOrder: turnOrder,
            currentTurn: turnOrder[0], // first array element
            sessionPostId: data.sessionPost.id,
        });

        this.logger.trace(`Saved following session to database: ${session}`);

        try {
            const databaseResult = await session.save();
            this.logger.debug(
                `Saved one SessionModel to the database (ID: ${databaseResult._id}).`
            );
            return Promise.resolve();
        } catch (error) {
            throw new CommandError(
                `Failed internally while saving to database.`,
                await this.stringProvider.get('SYSTEM.ERROR.INTERNAL.MONGOOSE-REJECT'),
                error
            );
        }
    }
}
