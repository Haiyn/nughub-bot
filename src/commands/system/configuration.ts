import { Command } from '@commands/command';
import { CommandResult } from '@models/commands/command-result';
import { PermissionLevel } from '@models/permissions/permission-level';
import { CommandValidationError, EmbedLevel, EmbedType } from '@src/models';
import {
    CategoryChannel,
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
                this.logger.warn(
                    `No subcommand mapping for configuration subcommand ${subcommand}`
                );
        }

        return {
            executed: executed,
            message: 'Successfully executed configuration subcommand.',
        };
    }

    async validateOptions(options: CommandInteractionOptionResolver): Promise<void> {
        // subcommand show does not have any options to validate
        if (options.getSubcommand() === 'show') return;

        const keyToEdit = options.getString('key');

        // validate that the key exists
        if (!(await this.configuration.exists(keyToEdit)))
            throw new CommandValidationError(
                `Key '${keyToEdit}' does not exist in db.`,
                `I could not find the key '${keyToEdit}' in the database. Are you sure it is correct?`,
                true
            );

        if (options.getSubcommand() === 'get') return;

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
                'Please make sure to supply exactly ONE value parameter.',
                true
            );

        const value = givenValueParameters[0];
        const editType = options.getString('edit_type');

        // Validate that an ID is again set to an ID
        if (keyToEdit.includes('Id') || keyToEdit.includes('id')) {
            if (
                value !== Channel &&
                value !== Role &&
                value !== User &&
                !this.helperService.isDiscordId(value)
            )
                throw new CommandValidationError(
                    `Trying to ${editType} invalid ID for ${keyToEdit}: ${value}`,
                    `The key you are trying to edit to needs a valid Channel, User, Role or Discord ID as a value!`,
                    true
                );
        }

        if (editType === 'add') {
            if (!(await this.configuration.isSet(keyToEdit)))
                throw new CommandValidationError(
                    `Trying to add to non-set key ${keyToEdit}`,
                    `${keyToEdit} can only have one value, you cannot add to it. Try replace instead.`,
                    true
                );
        }

        if (editType === 'replace') {
            if (await this.configuration.isSet(keyToEdit))
                throw new CommandValidationError(
                    `Trying to replace entire set ${keyToEdit}`,
                    `You cannot replace all entries for ${keyToEdit}! Either add a value with add or remove one with remove.`,
                    true
                );
        }

        if (editType === 'remove') {
            if (!(await this.configuration.isSet(keyToEdit)))
                throw new CommandValidationError(
                    `Trying to remove from non-set key ${keyToEdit}`,
                    `You cannot remove values from ${keyToEdit} because it only has one value. Use replace instead.`,
                    true
                );
        }
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
        let values: string;
        if (await this.configuration.isSet(keyToGet)) {
            const result = await this.configuration.getSet(keyToGet);
            values = result.join(', ');
            if (values.length > 4096) {
                values.slice(0, 4093);
                values += '...';
            }
        } else {
            values = await this.configuration.getString(keyToGet);
        }

        const embed: MessageEmbed = await this.embedProvider.get(
            EmbedType.Technical,
            EmbedLevel.Info,
            {
                title: keyToGet,
                content: values,
            }
        );
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
        const valuesToAdd = this.parseValues(interaction);
        const editType = interaction.options.getString('edit_type');
        const keyToEdit = interaction.options.getString('key');

        await this.validateParsedParameters(interaction, valuesToAdd, editType, keyToEdit);

        let response = '';
        let success = false;

        switch (editType) {
            case 'add':
                this.logger.debug(`Adding to ${keyToEdit}: ${valuesToAdd}`);
                await this.configuration.addToSet(keyToEdit, valuesToAdd as string[]);
                response = `I successfully added ${valuesToAdd} to ${keyToEdit}!`;
                success = true;
                break;
            case 'replace':
                this.logger.debug(
                    `Replacing previous value for ${keyToEdit} with ${valuesToAdd[0]}`
                );
                await this.configuration.setString(keyToEdit, valuesToAdd[0]);
                response = `I successfully replaced the previous value of ${keyToEdit} with ${valuesToAdd}!`;
                success = true;
                break;
            case 'remove':
                this.logger.debug(`Removing ${valuesToAdd[0]} from ${keyToEdit}`);
                success = await this.configuration.removeFromSet(keyToEdit, valuesToAdd[0]);
                response = success
                    ? `I successfully removed ${valuesToAdd} from ${keyToEdit}!`
                    : `I could not remove ${valuesToAdd} from ${keyToEdit}. Are you sure ${valuesToAdd} is in ${keyToEdit}?`;
                break;
        }

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

    /**
     * Parses the passed value parameters into a string array
     *
     * @param interaction The interaction
     * @returns The parsed values
     */
    private parseValues(interaction: CommandInteraction): string[] {
        // Check if the passed channel is a category. If so, return all category children channel ids
        const channel = interaction.options.getChannel('channel_value');
        if (channel !== null && channel.type === 'GUILD_CATEGORY') {
            this.logger.debug('Given channel is a category, fetching all children.');
            const values = [];
            (channel as CategoryChannel).children.forEach((channel) => values.push(channel.id));
            return values;
        }

        // Get the string value or the IDs from the channel/role/user choices
        let givenValueParameters = [];
        givenValueParameters.push(interaction.options.getString('manual_value'));
        givenValueParameters.push(interaction.options.getChannel('channel_value')?.id);
        givenValueParameters.push(interaction.options.getRole('role_value')?.id);
        givenValueParameters.push(interaction.options.getUser('user_value')?.id);
        givenValueParameters = givenValueParameters.filter((n) => n !== null && n !== undefined); // filter out null values

        this.logger.debug(
            `Parsed one configuration value to be processed: ${givenValueParameters}`
        );
        return givenValueParameters;
    }

    /**
     * Validates the parsed values
     *
     * @param interaction The interaction
     * @param values The parsed values
     * @param editType The subcommand type
     * @param key the key to be edited
     * @returns Resolves if no errors
     * @throws {CommandValidationError} Throws if parsed values are invalid
     */
    private async validateParsedParameters(
        interaction: CommandInteraction,
        values: string[],
        editType: string,
        key: string
    ) {
        // Validate that non-owner isn't trying to change the owner ID
        if (
            key === 'Permission_User_4_Id' &&
            interaction.member.user.id !==
                (await this.configuration.getString('Permission_User_4_Id'))
        ) {
            throw new CommandValidationError(
                `Unprivileged user trying to edit Owner ID configuration`,
                `You are not permitted to edit this value.`
            );
        }

        // Validate that user did not give a category as a channel for a single channel key
        if (values.length > 1 && (editType === 'replace' || editType === 'remove')) {
            throw new CommandValidationError(
                `Trying to add a category to a single value key ${key}.`,
                `You cannot add a category to ${key}, because it can only take one specific channel!`
            );
        }
    }
}
