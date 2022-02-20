import { DragonAgeGame } from '@models/misc/dragon-age-game.enum';
import { Mapper } from '@src/mappers/mapper';
import { injectable } from 'inversify';

@injectable()
export class DragonAgeGameMapper extends Mapper {
    public static mapEnumToStringName(game: DragonAgeGame): string {
        switch (game) {
            case DragonAgeGame.DAO:
                return 'Dragon Age: Origins';
            case DragonAgeGame.DA2:
                return 'Dragon Age 2';
            case DragonAgeGame.DAI:
                return 'Dragon Age: Inquisition';
            default:
                return 'Dragon Age';
        }
    }
}
