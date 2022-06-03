import { Mapper } from '@src/mappers/mapper';
import { Hiatus as HiatusData, IHiatusSchema } from '@src/models';
import { injectable } from 'inversify';

@injectable()
export class HiatusMapper extends Mapper {
    public async mapHiatusSchemaToHiatus(hiatusModel: IHiatusSchema): Promise<HiatusData> {
        const hiatusData: HiatusData = {
            member: await this.userService.getGuildMemberById(hiatusModel.userId),
            reason: hiatusModel.reason,
            hiatusPostId: hiatusModel.hiatusPostId,
        };
        if (hiatusModel.expires) hiatusData.expires = hiatusModel.expires;

        return hiatusData;
    }
}
