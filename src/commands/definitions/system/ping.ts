import { SlashCommandBuilder } from '@discordjs/builders';

/**
 * Returns the application command definition for ping
 *
 * @returns the application command definition
 */
export function commandDefinition(): SlashCommandBuilder {
    return new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Pings the bot to see if it is alive.');
}
