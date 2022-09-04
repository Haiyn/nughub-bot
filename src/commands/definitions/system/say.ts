import { SlashCommandBuilder } from '@discordjs/builders';

/**
 * Returns the application command definition for say
 *
 * @returns the application command definition
 */
export function commandDefinition(): SlashCommandBuilder {
    const command = new SlashCommandBuilder()
        .setName('say')
        .setDescription('Sends a message.')
        .addStringOption((option) =>
            option.setName('message').setDescription('The message to send.').setRequired(true)
        )
        .addChannelOption((option) =>
            option
                .setName('channel')
                .setDescription('The channel to send the message in (default: current channel)')
        );

    return <SlashCommandBuilder>command;
}
