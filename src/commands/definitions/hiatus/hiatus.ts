import { SlashCommandBuilder } from '@discordjs/builders';

/**
 * Returns the application command definition for hiatus
 *
 * @returns the application command definition
 */
export function commandDefinition(): SlashCommandBuilder {
    const command = new SlashCommandBuilder()
        .setName('hiatus')
        .setDescription(
            'Create or remove a hiatus to receive an extra week of time to reply in RPs.'
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName('create')
                .setDescription("Go on a hiatus and let people know that you'll be away.")
                .addStringOption((option) =>
                    option
                        .setName('reason')
                        .setDescription('The reason why you will be away.')
                        .setRequired(true)
                )
                .addStringOption((option) =>
                    option
                        .setName('until')
                        .setDescription('A day when you will return. Format example: 26 Mar 2022')
                        .setRequired(false)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName('edit')
                .setDescription('Edit your hiatus end date or reason.')
                .addStringOption((option) =>
                    option
                        .setName('until')
                        .setDescription('A day when you will return. Format example: 26 Mar 2022')
                        .setRequired(false)
                )
                .addStringOption((option) =>
                    option
                        .setName('reason')
                        .setDescription('The reason why you will be away.')
                        .setRequired(false)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand.setName('end').setDescription('End your hiatus.')
        );

    return <SlashCommandBuilder>command;
}
