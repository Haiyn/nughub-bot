import { SlashCommandBuilder } from '@discordjs/builders';

/**
 * Returns the application command definition for session finish
 *
 * @returns {SlashCommandBuilder} the application command definition
 */
export function commandDefinition(): SlashCommandBuilder {
    const command = new SlashCommandBuilder()
        .setName('finish')
        .setDescription('Finishes an ongoing RP in a channel')
        .addChannelOption((option) =>
            option
                .setName('channel')
                .setDescription('The channel with the ongoing RP')
                .setRequired(true)
        );

    return <SlashCommandBuilder>command;
}
