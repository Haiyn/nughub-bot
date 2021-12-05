import { Service } from '@services/service';
import { User } from 'discord.js';
import { injectable } from 'inversify';

/** A service that handles Discord users */
@injectable()
export class UserService extends Service {
    public async getUserById(id: string): Promise<User> {
        const fetchedUser = await this.client.users.fetch(id);
        if (!fetchedUser) this.logger.warn(`Could not find user for passed ID ${id}`);
        return fetchedUser;
    }
}
