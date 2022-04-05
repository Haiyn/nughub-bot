import { Mapper } from '@src/mappers/mapper';
import {
    CanonCharacter,
    CanonCharacterSchema,
    OriginalCharacter,
    OriginalCharacterSchema,
} from '@src/models';
import { injectable } from 'inversify';

@injectable()
export class CharacterMapper extends Mapper {
    public async mapOriginalCharacterSchemaToOriginalCharacter(
        originalCharacterSchema: OriginalCharacterSchema
    ): Promise<OriginalCharacter> {
        return {
            name: originalCharacterSchema.name,
            game: originalCharacterSchema.game,
            race: originalCharacterSchema.race,
            age: originalCharacterSchema.age,
            member: await this.userService.getGuildMemberById(originalCharacterSchema.userId),
        };
    }

    public async mapCanonCharacterSchemaToCanonCharacter(
        canonCharacterSchema: CanonCharacterSchema
    ): Promise<CanonCharacter> {
        return {
            name: canonCharacterSchema.name,
            game: canonCharacterSchema.game,
            availability: canonCharacterSchema.availability,
            claimer: await this.userService.getGuildMemberById(canonCharacterSchema.claimerId),
        };
    }
}
