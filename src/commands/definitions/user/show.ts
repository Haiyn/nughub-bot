import { SlashCommandBuilder } from '@discordjs/builders';

/**
 * Returns the application command definition for showing pending replies
 *
 * @returns the application command definition
 */
export function commandDefinition(): SlashCommandBuilder {
    return new SlashCommandBuilder()
        .setName('show')
        .setDescription('Shows all your pending replies.');
}
