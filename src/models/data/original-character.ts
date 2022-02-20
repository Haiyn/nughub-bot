import { DragonAgeGame } from '@models/misc/dragon-age-game.enum';

export interface OriginalCharacter {
    game: DragonAgeGame;
    race: string;
    age: number;
}
