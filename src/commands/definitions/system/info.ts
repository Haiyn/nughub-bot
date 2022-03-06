import { SlashCommandBuilder } from '@discordjs/builders';

/**
 * Returns the application command definition for info
 *
 * @returns the application command definition
 */
export function commandDefinition(): SlashCommandBuilder {
    return new SlashCommandBuilder()
        .setName('info')
        .setDescription('Information and help about the bot.');
}
