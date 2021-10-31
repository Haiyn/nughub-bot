import { SlashCommandBuilder } from '@discordjs/builders';

export function commandDefinition(): SlashCommandBuilder {
    const command = new SlashCommandBuilder()
        .setName('finish')
        .setDescription('Finishes an ongoing RP in a channel')
        .addChannelOption((option) =>
            option.setName('channel').setDescription('The channel with the ongoing RP')
        );

    return <SlashCommandBuilder>command;
}
