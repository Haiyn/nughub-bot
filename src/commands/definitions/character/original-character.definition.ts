import { SlashCommandBuilder } from '@discordjs/builders';
import { DragonAgeGame } from '@models/misc/dragon-age-game.enum';

/**
 * Returns the application command definition for session edit
 *
 * @returns the application command definition
 */
export function commandDefinition(): SlashCommandBuilder {
    const command = new SlashCommandBuilder()
        .setName('oc')
        .setDescription('Manage original characters.')
        .addSubcommand((option) =>
            option
                .setName('add')
                .setDescription('Add a canon character')
                .addUserOption((option) =>
                    option
                        .setName('user')
                        .setDescription('The user associated with the OC')
                        .setRequired(true)
                )
                .addStringOption((option) =>
                    option
                        .setName('name')
                        .setDescription('The name of the original character')
                        .setRequired(true)
                )
                .addStringOption((option) =>
                    option
                        .setName('game')
                        .setDescription('The game the character is in')
                        .setRequired(true)
                        .addChoice(DragonAgeGame[DragonAgeGame.DAO], DragonAgeGame.DAO.toString())
                        .addChoice(DragonAgeGame[DragonAgeGame.DA2], DragonAgeGame.DA2.toString())
                        .addChoice(DragonAgeGame[DragonAgeGame.DAI], DragonAgeGame.DAI.toString())
                )
                .addStringOption((option) =>
                    option
                        .setName('race')
                        .setDescription('The race of the character')
                        .setRequired(true)
                )
                .addStringOption((option) =>
                    option
                        .setName('age')
                        .setDescription('The age of the character')
                        .setRequired(true)
                )
                .addStringOption((option) =>
                    option
                        .setName('pronouns')
                        .setDescription('The pronouns for the character')
                        .setRequired(true)
                )
        )
        .addSubcommand((option) =>
            option
                .setName('remove')
                .setDescription('Remove a canon character')
                .addStringOption((option) =>
                    option
                        .setName('game')
                        .setDescription('The game the character is in')
                        .setRequired(true)
                        .addChoice(DragonAgeGame[DragonAgeGame.DAO], DragonAgeGame.DAO.toString())
                        .addChoice(DragonAgeGame[DragonAgeGame.DA2], DragonAgeGame.DA2.toString())
                        .addChoice(DragonAgeGame[DragonAgeGame.DAI], DragonAgeGame.DAI.toString())
                )
        );

    return <SlashCommandBuilder>command;
}
