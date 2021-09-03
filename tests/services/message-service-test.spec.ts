import "reflect-metadata";
import "mocha";
import { expect } from "chai";
import { instance, mock } from "ts-mockito";
import { Message, User } from "discord.js";
import { Logger } from "tslog";
import { MessageService } from "@src/services";

describe("MessageService", () => {
    let mockedServiceLoggerClass: Logger;
    let mockedServiceLoggerInstance: Logger;
    let mockedMessageClass: Message;
    let mockedMessageInstance: Message;
    let mockedMessageUser: User;
    let service: MessageService;
    let result: boolean;

    beforeEach(() => {
        mockedServiceLoggerClass = mock(Logger);
        mockedServiceLoggerInstance = instance(mockedServiceLoggerClass);
        mockedMessageClass = mock(Message);
        mockedMessageInstance = instance(mockedMessageClass);
        mockedMessageUser = mock(User);
        mockedMessageInstance.content = "Bot message";
        mockedMessageInstance.author = mockedMessageUser;

        service = new MessageService("!", mockedServiceLoggerInstance);
    });

    it("isBot should return true", async () => {
        mockedMessageInstance.author.bot = true;

        result = await service.isBotMessage(mockedMessageInstance);

        expect(result).true;
    });

    it("isBot should return false", async () => {
        mockedMessageInstance.author.bot = false;

        result = await service.isBotMessage(mockedMessageInstance);

        expect(result).false;
    });

    it("isPrefixed should return true", async () => {
        mockedMessageInstance.content = "!start";

        result = await service.isPrefixedMessage(mockedMessageInstance);

        expect(result).true;
    });

    it("isPrefixed should return false", async () => {
        mockedMessageInstance.content = "not prefixed";

        result = await service.isPrefixedMessage(mockedMessageInstance);

        expect(result).false;
    });
});