import { SlashCommandBuilder } from '@discordjs/builders';

export function commandDefinition(): SlashCommandBuilder {
    const command = new SlashCommandBuilder()
        .setName('next')
        .setDescription('Advances the turn in an ongoing RP session')
        .addChannelOption((option) =>
            option
                .setName('channel')
                .setDescription('The channel with the ongoing RP')
                .setRequired(false)
        )
        .addStringOption((option) =>
            option
                .setName('message')
                .setDescription('A message to the next user')
                .setRequired(false)
        );

    return <SlashCommandBuilder>command;
}
