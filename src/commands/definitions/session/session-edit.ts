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
                .addChannelOption((option) =>
                    option
                        .setName('channel')
                        .setDescription('The channel with the ongoing RP that you want to edit')
                        .setRequired(true)
                )
                .addBooleanOption((option) =>
                    option
                        .setName('notify')
                        .setDescription(
                            "Whether the user should be notified that it's their turn now or not"
                        )
                        .setRequired(true)
                )
        );

    return <SlashCommandBuilder>command;
}
