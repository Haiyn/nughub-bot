import { HiatusModel } from '@models/jobs/hiatus-schema';
import { HiatusStatus } from '@models/ui/hiatus-status';
import { Service } from '@services/service';
import { User } from 'discord.js';
import { injectable } from 'inversify';
import moment = require('moment');

/** A service that handles Discord users */
@injectable()
export class UserService extends Service {
    /**
     * Gets a discord user by their ID
     *
     * @param id the id
     * @returns the discord user
     */
    public async getUserById(id: string): Promise<User> {
        const fetchedUser = await this.client.users.fetch(id);
        if (!fetchedUser) this.logger.warn(`Could not find user for passed ID ${id}`);
        return fetchedUser;
    }

    /**
     * Gets a hiatus status string according to whether the user has a hiatus or not
     *
     * @param userId the userid of the user to check
     * @param detailed whether or not the information returned should be detailed or not
     * @returns a hiatus status string
     */
    public async getUserHiatusStatus(userId: string, detailed = false): Promise<string> {
        const hiatus = await HiatusModel.findOne({ userId: userId }).exec();
        if (!hiatus) return HiatusStatus.NoHiatus;
        if (hiatus.expires) {
            if (!detailed) return HiatusStatus.ActiveHiatus;
            return HiatusStatus.ActiveHiatus + `(returns <t:${moment(hiatus.expires).unix()}:R>)`;
        }
        return HiatusStatus.ActiveIndefiniteHiatus;
    }

    /**
     * Checks if user has an active hiatus
     *
     * @param userId the user id of the user to check
     * @returns true if hiatus exists, false otherwise
     */
    public async userHasActiveHiatus(userId: string): Promise<boolean> {
        const hiatus = await HiatusModel.findOne({ userId: userId }).exec();
        return hiatus != null;
    }
}
