import { SlashCommandBuilder } from '@discordjs/builders';

/**
 * Returns the application command definition for strings
 *
 * @returns the application command definition
 */
export function commandDefinition(): SlashCommandBuilder {
    return <SlashCommandBuilder>new SlashCommandBuilder()
        .setName('strings')
        .setDescription('Commands relating to strings and shown text.')
        .addSubcommand((subcommand) =>
            subcommand.setName('show').setDescription('Show the current string keys.')
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName('get')
                .setDescription('Gets the values of a specific key.')
                .addStringOption((option) =>
                    option
                        .setName('key')
                        .setDescription(
                            'The key to get the values of. You can see them all with /strings show.'
                        )
                        .setRequired(true)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName('edit')
                .setDescription('Edit a specific key.')
                .addStringOption((option) =>
                    option
                        .setName('key')
                        .setDescription('The key to edit. You can see them all with /strings show.')
                        .setRequired(true)
                )
                .addStringOption((option) =>
                    option
                        .setName('value')
                        .setDescription('The new value of the key')
                        .setRequired(true)
                )
        );
}
