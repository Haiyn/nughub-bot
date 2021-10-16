import { SlashCommandBuilder } from '@discordjs/builders';

export const ping = new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Pings the bot to see if it is alive.');
