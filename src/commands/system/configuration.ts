import { Command } from '@commands/command';
import { CommandResult } from '@models/commands/command-result';
import { PermissionLevel } from '@models/permissions/permission-level';
import { EmbedLevel, EmbedType } from '@src/models';
import { CommandInteraction, MessageEmbed } from 'discord.js';
import { injectable } from 'inversify';

@injectable()
export class Configuration extends Command {
    public permissionLevel: PermissionLevel = PermissionLevel.Administrator;

    async run(interaction: CommandInteraction): Promise<CommandResult> {
        // Defer the reply to not run over the 3 sec reply limit
        await interaction.deferReply({
            ephemeral: await this.configuration.isIn(
                'Channels_RpChannelIds',
                interaction.channelId
            ),
        });

        const subcommand = interaction.options.getSubcommand();
        this.logger.debug(`Matching subcommand for ${interaction.commandName}: ${subcommand}`);
        if (subcommand === 'show') await this.show(interaction);

        return {
            executed: true,
            message: 'Successfully executed configuration subcommand.',
        };
    }

    /**
     * Runs the configuration show subcommand
     *
     * @param interaction The original interaction
     * @returns resolves when done
     */
    private async show(interaction: CommandInteraction): Promise<void> {
        // Fetch the keys
        const keys: string[] = [];
        this.logger.debug(`Fetching database keys...`);
        keys.push(...(await this.configuration.scan(0, 'CONFIGURATION_*', [])));
        keys.push(...(await this.configuration.scan(0, 'PERMISSION_*', [])));
        this.logger.debug(`Fetched ${keys.length} database keys.`);

        // Construct the embed(s) without stepping over the embed description length
        keys.sort().reverse();
        const embeds: MessageEmbed[] = [];
        const maxContentLength = 4096;
        let embedCount = 0;

        while (keys.length > 0) {
            this.logger.trace(`Keys array length is at ${keys.length}`);
            let content = '';
            while (content.length < maxContentLength) {
                this.logger.trace(
                    `Adding new key to content: ${content.length} < ${maxContentLength}`
                );
                if (keys.length === 0) break;
                content += keys.pop() + '\n';
            }
            embeds.push(
                await this.embedProvider.get(EmbedType.Technical, EmbedLevel.Info, {
                    title: embedCount === 0 ? 'Current Configuration Keys' : '',
                    content: content,
                })
            );
            embedCount++;
        }

        await interaction.editReply({
            embeds: embeds,
        });
    }

    async validateOptions(): Promise<void> {
        return;
    }
}
