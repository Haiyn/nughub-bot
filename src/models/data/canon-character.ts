import { CanonCharacterAvailability } from '@models/misc/canon-character-availability.enum';
import { DragonAgeGame } from '@models/misc/dragon-age-game.enum';
import { GuildMember } from 'discord.js';

export interface CanonCharacter {
    name: string;
    game: DragonAgeGame;
    availability: CanonCharacterAvailability;
    claimer?: GuildMember;
}
