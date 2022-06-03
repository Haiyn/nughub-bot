import { Mapper } from '@src/mappers/mapper';
import {
    CanonCharacter,
    CanonCharacterSchema,
    CharacterPairing,
    CharacterPairingSchema,
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
            pronouns: originalCharacterSchema.pronouns,
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

    public async mapCharacterPairingSchemaToCharacterPairing(
        characterPairingSchema: CharacterPairingSchema
    ): Promise<CharacterPairing> {
        return {
            game: characterPairingSchema.game,
            member1: await this.userService.getGuildMemberById(characterPairingSchema.userId1),
            name1: characterPairingSchema.name1,
            member2: await this.userService.getGuildMemberById(characterPairingSchema.userId2),
            name2: characterPairingSchema.name2,
        };
    }
}
