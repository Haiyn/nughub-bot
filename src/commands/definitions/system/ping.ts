import { SlashCommandBuilder } from '@discordjs/builders';

export const commandDefinition: SlashCommandBuilder = new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Pings the bot to see if it is alive.');
