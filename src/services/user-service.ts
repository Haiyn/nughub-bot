import { Service } from '@services/service';
import container from '@src/inversify.config';
import { TYPES } from '@src/types';
import { GuildMember, User } from 'discord.js';
import { injectable } from 'inversify';

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
        this.logger.trace(`Fetching user for ID ${id}`);
        const fetchedUser = await this.client.users.fetch(id);
        if (!fetchedUser) this.logger.warn(`Could not find user for passed ID ${id}`);
        return fetchedUser;
    }

    /**
     * Gets a guild member
     *
     * @param id the id of the guild member
     * @returns the guild member
     */
    public async getGuildMemberById(id: string): Promise<GuildMember> {
        this.logger.trace(`Fetching guild member for ID ${id}`);
        const guild = await this.client.guilds.fetch(container.get<string>(TYPES.GuildId));
        const fetchedMember = await guild.members.fetch(id);
        if (!fetchedMember)
            this.logger.warn(
                `Could not find guild member for passed ID ${id} in guild ${guild.name}`
            );
        return fetchedMember;
    }

    /**
     * Gets the standardized way to display a guild member in discord
     *
     * @param member the guild member
     * @returns a string of the display
     */
    public getMemberDisplay(member: GuildMember): string {
        return `${member} ${member.displayName}`;
    }

    public getEscapedDisplayName(member: GuildMember): string {
        return member.displayName.replace('(', '').replace(')', '');
    }
}
