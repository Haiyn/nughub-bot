import { SlashCommandBuilder } from '@discordjs/builders';

/**
 * Returns the application command definition for configuration
 *
 * @returns the application command definition
 */
export function commandDefinition(): SlashCommandBuilder {
    return <SlashCommandBuilder>new SlashCommandBuilder()
        .setName('configuration')
        .setDescription('Commands relating to the configuration of the bot.')
        .addSubcommand((subcommand) =>
            subcommand.setName('show').setDescription('Show the current configuration.')
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName('get')
                .setDescription('Gets the values of a specific key.')
                .addStringOption((option) =>
                    option
                        .setName('key')
                        .setDescription(
                            'The key to get the values of. You can see them all with /configuration show.'
                        )
                        .setRequired(true)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName('edit')
                .setDescription('Edit the current configuration.')
                .addStringOption((option) =>
                    option
                        .setName('edit_type')
                        .setDescription('The type of edit action you want to run.')
                        .addChoice('Replace an existing value', 'replace')
                        .addChoice('Add to an existing value', 'add')
                        .addChoice('Remove one entry from an existing value', 'remove')
                        .setRequired(true)
                )
                .addStringOption((option) =>
                    option
                        .setName('key')
                        .setDescription(
                            'The key to edit. You can see them all with /configuration show.'
                        )
                        .setRequired(true)
                )
                .addStringOption((option) =>
                    option
                        .setName('manual_value')
                        .setDescription('If you want to edit in a free text.')
                        .setRequired(false)
                )
                .addChannelOption((option) =>
                    option
                        .setName('channel_value')
                        .setDescription(
                            "If you want to edit in a channel. Must be used for all configuration keys that contain 'ChannelId'."
                        )
                        .setRequired(false)
                )
                .addRoleOption((option) =>
                    option
                        .setName('role_value')
                        .setDescription(
                            "If you want to edit in a role. Must be used for all configuration keys that contain 'Role'."
                        )
                        .setRequired(false)
                )
                .addUserOption((option) =>
                    option
                        .setName('user_value')
                        .setDescription(
                            "If you want to edit in a user. Must be used for all configuration keys that contain 'User'."
                        )
                        .setRequired(false)
                )
        );
}
