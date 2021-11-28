import { Command } from '@commands/command';
import { CommandResult } from '@models/commands/command-result';
import { PermissionLevel } from '@models/permissions/permission-level';
import { CommandValidationError, EmbedLevel, EmbedType } from '@src/models';
import {
    Channel,
    CommandInteraction,
    CommandInteractionOptionResolver,
    MessageEmbed,
    Role,
    User,
} from 'discord.js';
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
        switch (subcommand) {
            case 'show':
                await this.show(interaction);
                break;
            case 'edit':
                await this.edit(interaction);
                break;
        }
        this.logger.debug(`Matching subcommand for ${interaction.commandName}: ${subcommand}`);
        if (subcommand === 'show')
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
                content += keys.pop().slice(14) + '\n';
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

    private async edit(interaction: CommandInteraction): Promise<void> {}

    async validateOptions(options: CommandInteractionOptionResolver): Promise<void> {
        // subcommand show does not have any options to validate
        if (options.getSubcommand() === 'show') return;

        // Validate that only one value parameter was given
        let givenValueParameters = [];
        givenValueParameters.push(options.getString('manual_value'));
        givenValueParameters.push(options.getChannel('channel_value'));
        givenValueParameters.push(options.getRole('role_value'));
        givenValueParameters.push(options.getUser('user_value'));
        givenValueParameters = givenValueParameters.filter((n) => n !== null); // filter out null values

        if (givenValueParameters.length != 1)
            throw new CommandValidationError(
                `User has given ${givenValueParameters.length} value parameters.`,
                'Please make sure to supply exactly ONE value parameter.'
            );

        const value = givenValueParameters[0];

        // validate that the key exists
        const keyToEdit = options.getString('key');
        if (!(await this.configuration.exists(keyToEdit)))
            throw new CommandValidationError(
                `Key '${keyToEdit}' does not exist in db.`,
                `I could not find the key '${keyToEdit}'. Are you sure it is correct?`
            );

        const editType = options.getString('edit_type');

        // Validate that an ID is again set to an ID
        if (keyToEdit.indexOf('Id') || keyToEdit.indexOf('id')) {
            if (
                value !== Channel &&
                value !== Role &&
                value !== User &&
                !this.helperService.isDiscordId(value)
            )
                throw new CommandValidationError(
                    `Trying to ${editType} invalid ID for ${keyToEdit}: ${value}`,
                    `The key you are trying to edit to needs to be a valid Channel, User, Role or Discord ID!`
                );
        }

        if (editType === 'add') {
            // TODO: create isSet
            if (!(await this.configuration.getSet(keyToEdit)))
                throw new CommandValidationError(
                    `Trying to add to non-set key ${keyToEdit}`,
                    `You cannot add an additional value to ${keyToEdit}! You can only replace it.`
                );
        }

        if (editType === 'replace') {
            // TODO: create isSet
            if (await this.configuration.getSet(keyToEdit))
                throw new CommandValidationError(
                    `Trying to replace entire set ${keyToEdit}`,
                    `You cannot replace all entries for ${keyToEdit}! Either add a value with add or remove one with remove.`
                );
        }

        if (editType === 'remove') {
            // TODO: create isSet
            if (!(await this.configuration.getSet(keyToEdit)))
                throw new CommandValidationError(
                    `Trying to remove from non-set key ${keyToEdit}`,
                    `You cannot remove values from ${keyToEdit} because it only has one value. Use replace instead.`
                );
        }
    }
}
