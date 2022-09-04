import { SlashCommandBuilder } from '@discordjs/builders';

/**
 * Returns the application command definition for say embed
 *
 * @returns the application command definition
 */
export function commandDefinition(): SlashCommandBuilder {
    const command = new SlashCommandBuilder()
        .setName('sayembed')
        .setDescription('Sends an embed.')
        .addStringOption((option) =>
            option
                .setName('description')
                .setDescription('The description in the embed to send.')
                .setRequired(true)
        )
        .addStringOption((option) =>
            option.setName('title').setDescription('The title in the embed to send.')
        )
        .addStringOption((option) =>
            option.setName('footer').setDescription('The footer in the embed to send.')
        )
        .addStringOption((option) =>
            option
                .setName('image')
                .setDescription('The image in the embed to send. Must be a link to an image!')
        )
        .addChannelOption((option) =>
            option
                .setName('channel')
                .setDescription('The channel to send the embed in (default: current channel)')
        );

    return <SlashCommandBuilder>command;
}
