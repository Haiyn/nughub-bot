import { MessageService } from '@services/message-service';
import { ConfigurationProvider } from '@src/providers';
import { ChannelService, UserService } from '@src/services';
import { TYPES } from '@src/types';
import { inject, injectable } from 'inversify';

/** Mappers that map objects to other objects */
@injectable()
export class Mapper {
    protected channelService: ChannelService;
    protected messageService: MessageService;
    protected userService: UserService;
    protected configuration: ConfigurationProvider;

    constructor(
        @inject(TYPES.ChannelService) channelService: ChannelService,
        @inject(TYPES.MessageService) messageService: MessageService,
        @inject(TYPES.UserService) userService: UserService,
        @inject(TYPES.ConfigurationProvider) configuration: ConfigurationProvider
    ) {
        this.channelService = channelService;
        this.messageService = messageService;
        this.userService = userService;
        this.configuration = configuration;
    }
}
