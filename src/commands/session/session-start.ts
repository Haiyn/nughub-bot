import { Command } from '@commands/command';
import { CommandError } from '@models/commands/command-error';
import { CommandResult } from '@models/commands/command-result';
import { CommandValidationError } from '@models/commands/command-validation-error';
import { Character } from '@models/data/character';
import { ICharacterSchema } from '@models/data/character-schema';
import { Session } from '@models/data/session';
import { SessionModel } from '@models/data/session-schema';
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
            this.configuration.channels.currentSessionsChannelId
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

        await interaction.reply({
            content: `I successfully started a new RP session in <#${sessionToSave.channel.id}>!`,
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
        if (
            !this.configuration.channels.rpChannelIds.find((channelId) => channelId == channel.id)
        ) {
            throw new CommandValidationError(
                `User provided channel that isn't in permitted RP channels list.`,
                "The channel you've provided is not a channel you can start a session in! Please pick a valid RP channel."
            );
        }

        if (await SessionModel.findOne({ channelId: channel.id }).exec()) {
            throw new CommandValidationError(
                `User provided channel that already has an active RP.`,
                `There is already a RP session running <#${channel.id}>!`
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
                    ? `Please provide a character name for every user you've mentioned!`
                    : `Please provide a user for every character name you've given!`
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
                "You can't start an RP that has the same character twice!"
            );
    }

    /**
     * Parses the session business object from all the given command options
     *
     * @param {CommandInteractionOptionResolver} options The command options given by the user
     * @returns {Promise<Session>} The parsed session
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
                `Failed internally while checking options.`,
                'Uh-oh, something went wrong while I was trying to validate your inputs!',
                error
            );
        }
    }

    /**
     * Saves the parsed session to a new message in the sessions channel
     *
     * @param {TextChannel} sessionsChannel The channel where the message is supposed to go
     * @param {Session} data The session business object
     * @returns {Promise<Message>} Resolves with the sent message
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
            const divider = '```⋟────────────────────────⋞```';

            const result = await sessionsChannel.send({
                content: postContent + divider,
                allowedMentions: { parse: [] },
            });
            this.logger.debug(`Sent new sessions message (ID: ${result.id})`);
            return Promise.resolve(result);
        } catch (error) {
            new CommandError(
                `Failed internally while saving to session channel.`,
                'Uh-oh, something went wrong while I was trying to post the session!',
                error
            );
        }
    }

    /**
     * Checks if the sessions channel is already initialized as one
     *
     * @param {Channel} sessionsChannel The channel to check
     * @returns {Promise<boolean>} Whether the channel is initialized or not
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
                    `I can't post the session in <#{0}> because there are messages in it that aren't from me!`
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
     * @param {TextChannel} sessionsChannel The channel to initialize
     * @returns {Promise<void>} Resolves when message sent
     * @throws {CommandError} Throws if message cannot be sent
     */
    private async initializeSessionsChannel(sessionsChannel: TextChannel): Promise<void> {
        const embed = new MessageEmbed()
            .setColor(this.configuration.guild.color as ColorResolvable)
            .setAuthor(sessionsChannel.guild.name, sessionsChannel.guild.iconURL())
            .setFooter('(squeaks regally)')
            .setTitle('Ongoing RP Sessions')
            .setDescription(
                'You can find all currently running RPs here - including their turn order.'
            );
        const message = await sessionsChannel.send({ embeds: [embed] });
        if (!message)
            throw new CommandError(
                'Sessions channel could not be initialized.',
                'Uh-oh, I ran into some trouble while trying to use !'
            );
        return Promise.resolve();
    }

    /**
     * Saves the new session to the database
     *
     * @param {Session} data The session data to save
     * @returns {Promise<void>} Resolves when session is saved
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
                'Uh-oh, something went wrong while I tried to save the session!',
                error
            );
        }
    }
}
