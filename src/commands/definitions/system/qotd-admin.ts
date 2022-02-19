import { SlashCommandBuilder } from '@discordjs/builders';

/**
 * Returns the application command definition for qotd admin
 *
 * @returns the application command definition
 */
export function commandDefinition(): SlashCommandBuilder {
    const command = new SlashCommandBuilder()
        .setName('qotdadmin')
        .setDescription('Administration of QOTDs.')
        .addSubcommand((option) =>
            option.setName('remove').setDescription('Remove one QOTD from the queue')
        )
        .addSubcommand((option) =>
            option
                .setName('edit')
                .setDescription('Edit one QOTD (e.g. for fixing typos)')
                .addStringOption((option) =>
                    option.setName('content').setDescription('The new content').setRequired(true)
                )
        )
        .addSubcommand((option) =>
            option
                .setName('show')
                .setDescription(
                    'Show all currently queued QOTDs. They are queued by order of submission (oldest first).'
                )
        );

    return <SlashCommandBuilder>command;
}
