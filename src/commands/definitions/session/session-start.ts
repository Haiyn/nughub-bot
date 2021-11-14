import { SlashCommandBuilder } from '@discordjs/builders';

/**
 * Returns the application command definition for session start
 *
 * @returns the application command definition
 */
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
                .setRequired(i < 2)
        );
        command.addStringOption((option) =>
            option
                .setName(`character${i}`)
                .setDescription(`The character name for the user #${i}.`)
                .setRequired(i < 2)
        );
    }
    return <SlashCommandBuilder>command;
}
