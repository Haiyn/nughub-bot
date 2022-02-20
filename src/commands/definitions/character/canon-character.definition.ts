import { SlashCommandBuilder } from '@discordjs/builders';
import { CanonCharacterAvailability } from '@models/misc/canon-character-availability.enum';
import { DragonAgeGame } from '@models/misc/dragon-age-game.enum';

/**
 * Returns the application command definition for session edit
 *
 * @returns the application command definition
 */
export function commandDefinition(): SlashCommandBuilder {
    const command = new SlashCommandBuilder()
        .setName('cc')
        .setDescription('Manage canon characters.')
        .addSubcommand((option) =>
            option
                .setName('add')
                .setDescription('Add a canon character')
                .addStringOption((option) =>
                    option
                        .setName('name')
                        .setDescription('The name of the canon character')
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
                        .setName('availability')
                        .setDescription('The availability of the character')
                        .setRequired(true)
                        .addChoice(
                            CanonCharacterAvailability[CanonCharacterAvailability.Available],
                            CanonCharacterAvailability.Available.toString()
                        )
                        .addChoice(
                            CanonCharacterAvailability[CanonCharacterAvailability.TemporaryClaim],
                            CanonCharacterAvailability.TemporaryClaim.toString()
                        )
                        .addChoice(
                            CanonCharacterAvailability[CanonCharacterAvailability.Claimed],
                            CanonCharacterAvailability.Claimed.toString()
                        )
                )
                .addUserOption((option) =>
                    option.setName('claimer').setDescription('The new claimer').setRequired(false)
                )
        )
        .addSubcommand((option) =>
            option
                .setName('assign')
                .setDescription('(Re-)Assign a canon character')
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
                        .setName('availability')
                        .setDescription('The availability of the character')
                        .setRequired(true)
                        .addChoice(
                            CanonCharacterAvailability[CanonCharacterAvailability.TemporaryClaim],
                            CanonCharacterAvailability.TemporaryClaim.toString()
                        )
                        .addChoice(
                            CanonCharacterAvailability[CanonCharacterAvailability.Claimed],
                            CanonCharacterAvailability.Claimed.toString()
                        )
                )
                .addUserOption((option) =>
                    option
                        .setName('claimer')
                        .setDescription('If the character is claimed, set the claimer with this')
                        .setRequired(true)
                )
        )
        .addSubcommand((option) =>
            option
                .setName('unassign')
                .setDescription('Unassign a canon character to make them available again')
                .addStringOption((option) =>
                    option
                        .setName('game')
                        .setDescription('The game the character is in')
                        .setRequired(true)
                        .addChoice(DragonAgeGame[DragonAgeGame.DAO], DragonAgeGame.DAO.toString())
                        .addChoice(DragonAgeGame[DragonAgeGame.DA2], DragonAgeGame.DA2.toString())
                        .addChoice(DragonAgeGame[DragonAgeGame.DAI], DragonAgeGame.DAI.toString())
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
