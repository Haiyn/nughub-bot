import { Command } from '@commands/command';
import { CommandResult } from '@models/commands/command-result';
import { PermissionLevel } from '@models/permissions/permission-level';
import { EmbedLevel } from '@models/ui/embed-level';
import { EmbedType } from '@models/ui/embed-type';
import container from '@src/inversify.config';
import { TYPES } from '@src/types';
import { CommandInteraction } from 'discord.js';
import { injectable } from 'inversify';

@injectable()
export class Info extends Command {
    public permissionLevel: PermissionLevel = PermissionLevel.Reader;

    async run(interaction: CommandInteraction): Promise<CommandResult> {
        const ownerId = container.get<string>(TYPES.BotOwnerId);
        const owner = await this.userService.getGuildMemberById(ownerId);
        const botVersion = container.get<string>(TYPES.BotVersion);

        const embedReply = await this.embedProvider.get(EmbedType.Detailed, EmbedLevel.Info, {
            authorName: this.client.user.username,
            authorIcon: this.client.user.avatarURL(),
            title: `I am the great and magnificent Xenon the Antiquarian.`,
            content:
                `I help out on the server, managing RPs, characters, hiatuses, QOTDs and more.\n\n` +
                `[**Command Reference**](https://github.com/Haiyn/xenon-the-antiquarian-bot/wiki/Command-Reference-(for-Users))\n\n` +
                `To report a bug or suggest an idea, contact ${owner}.`,
            footer: `${this.client.user.username} - v${botVersion}`,
        });
        await this.interactionService.reply(interaction, {
            embeds: [embedReply],
        });

        return Promise.resolve({
            executed: true,
            message: `Successfully sent info command.`,
        });
    }

    async validateOptions(): Promise<void> {
        return;
    }
}
