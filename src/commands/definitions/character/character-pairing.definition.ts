import { SlashCommandBuilder } from '@discordjs/builders';
import { DragonAgeGame } from '@models/misc/dragon-age-game.enum';

/**
 * Returns the application command definition for character pairing
 *
 * @returns the application command definition
 */
export function commandDefinition(): SlashCommandBuilder {
    const command = new SlashCommandBuilder()
        .setName('cp')
        .setDescription('Manage character pairings.')
        .addSubcommand((option) =>
            option
                .setName('add')
                .setDescription('Add a character pairing')
                .addStringOption((option) =>
                    option
                        .setName('game')
                        .setDescription('The game the pairing is in')
                        .setRequired(true)
                        .addChoice(DragonAgeGame[DragonAgeGame.DAO], DragonAgeGame.DAO.toString())
                        .addChoice(DragonAgeGame[DragonAgeGame.DA2], DragonAgeGame.DA2.toString())
                        .addChoice(DragonAgeGame[DragonAgeGame.DAI], DragonAgeGame.DAI.toString())
                )
                .addStringOption((option) =>
                    option
                        .setName('name1')
                        .setDescription('The name of the first character')
                        .setRequired(true)
                )
                .addUserOption((option) =>
                    option
                        .setName('user1')
                        .setDescription('The user who plays the first character')
                        .setRequired(true)
                )
                .addStringOption((option) =>
                    option
                        .setName('name2')
                        .setDescription('The name of the second character')
                        .setRequired(true)
                )
                .addUserOption((option) =>
                    option
                        .setName('user2')
                        .setDescription('The user who plays the second character')
                        .setRequired(true)
                )
        )
        .addSubcommand((option) =>
            option
                .setName('remove')
                .setDescription('Remove a character pairing')
                .addStringOption((option) =>
                    option
                        .setName('game')
                        .setDescription('The game the pairing is in')
                        .setRequired(true)
                        .addChoice(DragonAgeGame[DragonAgeGame.DAO], DragonAgeGame.DAO.toString())
                        .addChoice(DragonAgeGame[DragonAgeGame.DA2], DragonAgeGame.DA2.toString())
                        .addChoice(DragonAgeGame[DragonAgeGame.DAI], DragonAgeGame.DAI.toString())
                )
        );

    return <SlashCommandBuilder>command;
}
