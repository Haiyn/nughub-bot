import { DragonAgeGame } from '@models/misc/dragon-age-game.enum';
import { GuildMember } from 'discord.js';

export interface CharacterPairing {
    game: DragonAgeGame;
    member1: GuildMember;
    name1: string;
    member2: GuildMember;
    name2: string;
}
