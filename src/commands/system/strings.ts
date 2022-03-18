import { Command } from '@commands/command';
import { CommandResult } from '@models/commands/command-result';
import { PermissionLevel } from '@models/permissions/permission-level';
import { CommandValidationError, EmbedLevel, EmbedType } from '@src/models';
import {
    CacheType,
    CommandInteraction,
    CommandInteractionOptionResolver,
    MessageEmbed,
} from 'discord.js';
import { injectable } from 'inversify';

@injectable()
export class Strings extends Command {
    public permissionLevel: PermissionLevel = PermissionLevel.Administrator;

    async run(interaction: CommandInteraction): Promise<CommandResult> {
        let executed = true;
        const subcommand = interaction.options.getSubcommand();
        this.logger.debug(`Matching subcommand for ${interaction.commandName}: ${subcommand}`);
        switch (subcommand) {
            case 'show':
                await this.show(interaction);
                break;
            case 'get':
                await this.get(interaction);
                break;
            case 'edit':
                executed = await this.edit(interaction);
                break;
            default:
                this.logger.warn(`No subcommand mapping for strings subcommand ${subcommand}`);
        }

        return {
            executed: executed,
            message: 'Successfully executed strings subcommand.',
        };
    }

    async validateOptions(
        options: Omit<CommandInteractionOptionResolver<CacheType>, 'getMessage' | 'getFocused'>
    ): Promise<void> {
        // subcommand show does not have any options to validate
        if (options.getSubcommand() === 'show') return;

        const keyToEdit = options.getString('key');

        // validate that the key exists
        if ((await this.stringProvider.get(keyToEdit)) === keyToEdit)
            throw new CommandValidationError(
                `Key '${keyToEdit}' does not exist in db.`,
                `I could not find the key '${keyToEdit}' in the database. Are you sure it is correct?`,
                true
            );
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
        this.logger.debug(`Fetching database string keys...`);
        keys.push(...(await this.configuration.scan(0, 'STRINGS.*', [])));
        this.logger.debug(`Fetched ${keys.length} database string keys.`);

        // Construct the embed(s) without stepping over the embed description length
        keys.sort().reverse();
        const embeds: MessageEmbed[] = [];
        const maxContentLength = 4096;
        let embedCount = 0;

        while (keys.length > 0) {
            this.logger.trace(`String keys array length is at ${keys.length}`);
            let content = '';
            while (content.length < maxContentLength) {
                this.logger.trace(
                    `Adding new string key to content: ${content.length} < ${maxContentLength}`
                );
                if (keys.length === 0) break;
                content += keys.pop().slice('STRINGS.'.length) + '\n';
            }
            embeds.push(
                await this.embedProvider.get(EmbedType.Technical, EmbedLevel.Info, {
                    title: embedCount === 0 ? 'Current String Keys' : '',
                    content: content,
                })
            );
            embedCount++;
        }

        await this.interactionService.reply(interaction, {
            embeds: embeds,
        });
    }

    /**
     * Runs the get subcommand
     *
     * @param interaction The original interaction
     * @returns Resolves when done
     */
    private async get(interaction: CommandInteraction): Promise<void> {
        const keyToGet = interaction.options.getString('key');
        const value: string = await this.stringProvider.get(keyToGet);

        let embed: MessageEmbed;

        if (value === keyToGet) {
            embed = await this.embedProvider.get(EmbedType.Technical, EmbedLevel.Warning, {
                title: 'No result found',
                content: `I could not find a value for the key '${keyToGet}'. Are you sure it is correct?`,
            });
        } else {
            embed = await this.embedProvider.get(EmbedType.Technical, EmbedLevel.Info, {
                title: keyToGet,
                content: value,
            });
        }

        await this.interactionService.reply(interaction, {
            embeds: [embed],
        });
    }

    /**
     * Runs the edit subcommand
     *
     * @param interaction The interaction
     * @returns Whether it was successful or not
     */
    private async edit(interaction: CommandInteraction): Promise<boolean> {
        const newValue = interaction.options.getString('value');
        let keyToEdit = interaction.options.getString('key');
        if (keyToEdit.includes('STRINGS.')) {
            keyToEdit = keyToEdit.replace('STRINGS.', '');
        }

        const success = await this.stringProvider.set(keyToEdit, newValue);
        const response = success
            ? `I successfully replaced the old value of ${keyToEdit} with '${newValue}'!`
            : `I could not replace the value of ${keyToEdit}.`;

        const embed = await this.embedProvider.get(
            EmbedType.Technical,
            success ? EmbedLevel.Success : EmbedLevel.Warning,
            {
                content: response,
            }
        );

        await this.interactionService.reply(interaction, {
            embeds: [embed],
        });

        return success;
    }
}
