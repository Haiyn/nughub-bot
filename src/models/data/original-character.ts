import { DragonAgeGame } from '@models/misc/dragon-age-game.enum';
import { GuildMember } from 'discord.js';

export interface OriginalCharacter {
    name: string;
    game: DragonAgeGame;
    race: string;
    age: number;
    member: GuildMember;
}
