import { SlashCommandBuilder } from '@discordjs/builders';

/**
 * Returns the application command definition for showing pending replies
 *
 * @returns the application command definition
 */
export function commandDefinition(): SlashCommandBuilder {
    const command = new SlashCommandBuilder()
        .setName('qotd')
        .setDescription('Add a question of the day.')
        .addStringOption((option) =>
            option.setName('question').setDescription('The question to add').setRequired(true)
        );

    return <SlashCommandBuilder>command;
}
