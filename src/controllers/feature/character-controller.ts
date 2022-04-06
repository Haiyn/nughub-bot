import { FeatureController } from '@controllers/feature/feature-controller';
import { CharacterListType } from '@models/misc/character-list-type.enum';
import { injectable } from 'inversify';

@injectable()
export class CharacterController extends FeatureController {
    /**
     * Initializes all available character lists in CharacterListType
     */
    public async initializeCharacterChannels(): Promise<void> {
        for (const listType in CharacterListType) {
            // we only want to iterate over the values, not the keys
            if (isNaN(Number(listType))) {
                return;
            }

            await this.characterService.initializeCharacterLists(
                CharacterListType[CharacterListType[listType]]
            );
        }
    }
}
