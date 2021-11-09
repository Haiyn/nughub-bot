import { Command } from '@commands/command';
import { CommandError } from '@models/commands/command-error';
import { CommandResult } from '@models/commands/command-result';
import { CommandValidationError } from '@models/commands/command-validation-error';
import { Character } from '@models/data/character';
import { ICharacterSchema } from '@models/data/character-schema';
import { Session } from '@models/data/session';
import { SessionModel } from '@models/data/session-schema';
import { EmbedLevel } from '@models/ui/embed-level';
import { EmbedType } from '@models/ui/embed-type';
import {
    Channel,
    ColorResolvable,
    CommandInteraction,
    CommandInteractionOptionResolver,
    Message,
    MessageEmbed,
    TextChannel,
} from 'discord.js';
import { injectable } from 'inversify';

@injectable()
export class SessionStart extends Command {
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

        const embedReply = await this.embedProvider.get(EmbedType.Minimal, EmbedLevel.Success, {
            content: await this.stringProvider.get('COMMAND.SESSION-START.SUCCESS', [
                sessionToSave.channel.id,
            ]),
        });
        await interaction.reply({
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
        if (!(await this.configuration.isIn('Channels_RpChannelIds', channel.id))) {
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
     * @param sessionsChannel The channel where the message is supposed to go
     * @param data The session business object
     * @returns Resolves with the sent message
     * @throws {CommandError} Throws if the message could not be sent
     */
    private async saveSessionToSessionChannel(
        sessionsChannel: TextChannel,
        data: Session
    ): Promise<Message> {
        try {
            let postContent = `\n\n<#${data.channel.id}>:\n`;
            data.turnOrder.forEach((character) => {
                if (
                    character.user.id === data.currentTurn.user.id &&
                    character.name === data.currentTurn.name
                )
                    postContent += ':arrow_right: ';
                postContent += `${character.name} <@${character.user.id}>\n`;
            });
            const divider = await this.stringProvider.get('SYSTEM.DECORATORS.SEPARATOR');

            const result = await sessionsChannel.send({
                content: postContent + divider,
                allowedMentions: { parse: [] },
            });
            this.logger.debug(`Sent new sessions message (ID: ${result.id})`);
            return Promise.resolve(result);
        } catch (error) {
            new CommandError(
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
            let isOnlyBotMessages = true;
            sessionsChannelMessages.each((message) => {
                if (message.author.id !== this.client.user.id) {
                    isOnlyBotMessages = false;
                    return;
                }
            });
            if (!isOnlyBotMessages) {
                throw new CommandError(
                    `Session Posts Channel has non-bot messages in it.`,
                    await this.stringProvider.get(
                        'COMMAND.SESSION-START.ERROR.COULD-NOT-INITIALIZE-CHANNEL',
                        [sessionsChannel.id]
                    )
                );
            }
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
        const embed = new MessageEmbed()
            .setColor((await this.configuration.getString('Guild_Color')) as ColorResolvable)
            .setAuthor(sessionsChannel.guild.name, sessionsChannel.guild.iconURL())
            .setFooter(
                await this.stringProvider.get('COMMAND.SESSION-START.INITIALIZE.EMBED-FOOTER')
            )
            .setTitle(await this.stringProvider.get('COMMAND.SESSION-START.INITIALIZE.EMBED-TITLE'))
            .setDescription(
                await this.stringProvider.get('COMMAND.SESSION-START.INITIALIZE.EMBED-DESCRIPTION')
            );
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
            new CommandError(
                `Failed internally while saving to database.`,
                await this.stringProvider.get('SYSTEM.ERROR.INTERNAL.MONGOOSE-REJECT'),
                error
            );
        }
    }
}
