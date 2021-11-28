import { SlashCommandBuilder } from '@discordjs/builders';

/**
 * Returns the application command definition for ping
 *
 * @returns the application command definition
 */
export function commandDefinition(): SlashCommandBuilder {
    return <SlashCommandBuilder>new SlashCommandBuilder()
        .setName('configuration')
        .setDescription('Commands relating to the configuration of the bot.')
        .addSubcommand((subcommand) =>
            subcommand.setName('show').setDescription('Show the current configuration.')
        );
}
