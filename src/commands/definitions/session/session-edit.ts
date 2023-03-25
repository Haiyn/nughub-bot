import { SlashCommandBuilder } from '@discordjs/builders';

/**
 * Returns the application command definition for session edit
 *
 * @returns the application command definition
 */
export function commandDefinition(): SlashCommandBuilder {
    const command = new SlashCommandBuilder()
        .setName('edit')
        .setDescription('Edits an ongoing RP')
        .addSubcommand((option) =>
            option
                .setName('add')
                .setDescription('Add one person to the RP')
                .addChannelOption((option) =>
                    option
                        .setName('channel')
                        .setDescription('The channel with the ongoing RP that you want to edit')
                        .setRequired(true)
                )
                .addUserOption((option) =>
                    option.setName('user').setDescription('The user to add').setRequired(true)
                )
                .addStringOption((option) =>
                    option
                        .setName('name')
                        .setDescription('The character name to add')
                        .setRequired(true)
                )
        )
        .addSubcommand((option) =>
            option
                .setName('remove')
                .setDescription('Remove one person from the RP')
                .addChannelOption((option) =>
                    option
                        .setName('channel')
                        .setDescription('The channel with the ongoing RP that you want to edit')
                        .setRequired(true)
                )
        )
        .addSubcommand((option) =>
            option
                .setName('set')
                .setDescription('Manually set the current turn for an RP.')
                .addBooleanOption((option) =>
                    option
                        .setName('notify')
                        .setDescription(
                            "Whether the user should be notified that it's their turn now or not"
                        )
                        .setRequired(true)
                )
        )
        .addSubcommand((option) =>
            option
                .setName('prioritize')
                .setDescription('Change whether or not the RP is tried to a main quest.')
                .addChannelOption((option) =>
                    option
                        .setName('channel')
                        .setDescription('The channel with the ongoing RP that you want to edit')
                        .setRequired(true)
                )
                .addBooleanOption((option) =>
                    option
                        .setName('mainquest')
                        .setDescription('Set this to true if the RP is tied to a main quest.')
                        .setRequired(true)
                )
        );

    return <SlashCommandBuilder>command;
}
