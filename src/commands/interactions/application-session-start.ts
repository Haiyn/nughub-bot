import { SlashCommandBuilder } from '@discordjs/builders';
import { ApplicationCommand } from '@commands/interactions/application-command';
import {
    Channel,
    ColorResolvable,
    CommandInteraction,
    CommandInteractionOptionResolver,
    Message,
    MessageEmbed,
    TextChannel,
} from 'discord.js';
import { ApplicationCommandResult } from '@src/interfaces/application-command-result.interface';
import { injectable } from 'inversify';
import { SessionModel } from '@models/session-schema';
import { ApplicationCommandValidationResultInterface } from '../../interfaces/application-command-validation-result.interface';
import { Session } from '@models/session';
import { Character } from '@models/character';
import { ICharacterSchema } from '@models/character-schema';
import { ApplicationCommandError } from '@models/application-command-error';

export function commandDefinition(): SlashCommandBuilder {
    const command = new SlashCommandBuilder()
        .setName('start')
        .setDescription('Start a new RP session in a given channel with a given turn order.')
        .addChannelOption((option) =>
            option
                .setName('channel')
                .setDescription('The channel in which to start the session.')
                .setRequired(true)
        );

    for (let i = 1; i <= 10; i++) {
        command.addUserOption((option) =>
            option
                .setName(`user${i}`)
                .setDescription(`The user that is supposed to go in turn order spot #${i}.`)
                .setRequired(i < 3)
        );
        command.addStringOption((option) =>
            option
                .setName(`character${i}`)
                .setDescription(`The character name for the user #${i}.`)
                .setRequired(i < 3)
        );
    }
    return <SlashCommandBuilder>command;
}

@injectable()
export class ApplicationSessionStart extends ApplicationCommand {
    async run(interaction: CommandInteraction): Promise<ApplicationCommandResult> {
        this.logger.debug('Validating options...');
        const validationResult = await this.validateOptions(interaction.options).catch((error) => {
            return Promise.reject(
                new ApplicationCommandError(
                    `Failed internally while validating options.`,
                    'Uh-oh, something went wrong while I was trying to validate your inputs!',
                    error
                )
            );
        });
        if (!validationResult.valid) {
            await interaction.reply(validationResult.userMessage);
            return Promise.resolve({
                executed: false,
                message: validationResult.internalMessage,
            });
        }

        this.logger.debug('Parsing session...');
        const sessionToSave = await this.parseSession(interaction.options).catch((error) => {
            return Promise.reject(
                new ApplicationCommandError(
                    `Failed internally while checking options.`,
                    'Uh-oh, something went wrong while I was trying to validate your inputs!',
                    error
                )
            );
        });

        this.logger.debug('Saving Session to session channel...');
        await this.saveSessionToSessionChannel(sessionToSave)
            .then((result) => {
                sessionToSave.sessionPost = result;
            })
            .catch((error) => {
                return Promise.reject(
                    new ApplicationCommandError(
                        `Failed internally while saving to session channel.`,
                        'Uh-oh, something went wrong while I was trying to post the session!',
                        error
                    )
                );
            });

        this.logger.debug('Saving Session to database...');
        await this.saveSessionToDatabase(sessionToSave).catch((error) => {
            return Promise.reject(
                new ApplicationCommandError(
                    `Failed internally while saving to database.`,
                    'Uh-oh, something went wrong while I tried to save the session!',
                    error
                )
            );
        });

        await interaction.reply(
            `I successfully started a new RP session in <#${sessionToSave.channel.id}>!`
        );
        return Promise.resolve({
            executed: true,
            message: `Successfully started new session.`,
        });
    }

    private async validateOptions(
        options: CommandInteractionOptionResolver
    ): Promise<ApplicationCommandValidationResultInterface> {
        // Channel
        const channel = this.channelService.getTextChannelByChannelId(
            options.getChannel('channel').id
        );
        if (
            !this.configuration.channels.rpChannelIds.find((channelId) => channelId == channel.id)
        ) {
            return Promise.resolve({
                valid: false,
                internalMessage: `User provided channel that isn't in permitted RP channels list.`,
                userMessage:
                    "The channel you've provided is not a channel you can start a session in! Please pick a valid RP channel.",
            });
        }
        if (await SessionModel.findOne({ channelId: channel.id }).exec()) {
            return Promise.resolve({
                valid: false,
                internalMessage: `User provided channel that already has an active RP.`,
                userMessage: `There is already a RP session running <#${channel.id}>!`,
            });
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
            return Promise.resolve({
                valid: false,
                internalMessage: `User provided uneven amounts of users and characters.`,
                userMessage:
                    users.length > characterNames.length
                        ? `Please provide a character name for every user you've mentioned!`
                        : `Please provide a user for every character name you've given!`,
            });
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
            return Promise.resolve({
                valid: false,
                internalMessage: `User provided the same character name more than once.`,
                userMessage: "You can't start an RP that has the same character twice!",
            });
        return Promise.resolve({
            valid: true,
        });
    }

    private async parseSession(options: CommandInteractionOptionResolver): Promise<Session> {
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
    }

    private async saveSessionToSessionChannel(data: Session): Promise<Message> {
        const sessionsChannel = this.channelService.getTextChannelByChannelId(
            this.configuration.channels.currentSessionsChannelId
        );

        // Check if sessions channel is ready for new message
        try {
            const initialized = await this.checkSessionsChannel(sessionsChannel);
            if (!initialized) {
                const success = await this.initializeSessionsChannel(sessionsChannel);
                if (!success) {
                    return Promise.reject(new Error('Sessions channel could not be initialized.'));
                }
                this.logger.debug('Sessions channel was initialized.');
            }
        } catch (error) {
            return Promise.reject(error);
        }

        // Send new message
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
            return Promise.resolve(error);
        }
    }

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
                return Promise.reject(
                    new Error(`Session Posts Channel has non-bot messages in it.`)
                );
            }
            this.logger.debug(`Session channel is already initialized.`);
            return Promise.resolve(true);
        }
        this.logger.debug(`Session channel is not yet initialized.`);
        return Promise.resolve(false);
    }

    private async initializeSessionsChannel(sessionsChannel: TextChannel): Promise<boolean> {
        const embed = new MessageEmbed()
            .setColor(this.configuration.guild.color as ColorResolvable)
            .setAuthor(sessionsChannel.guild.name, sessionsChannel.guild.iconURL())
            .setFooter('(squeaks regally)')
            .setTitle('Ongoing RP Sessions')
            .setDescription(
                'You can find all currently running RPs here - including their turn order.'
            );
        const message = await sessionsChannel.send({ embeds: [embed] });
        if (!message) return Promise.resolve(false);
        return Promise.resolve(true);
    }

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
            return Promise.reject(error);
        }
    }
}
