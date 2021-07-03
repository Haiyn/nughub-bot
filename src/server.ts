import { Client, Message } from "discord.js";
import { inject, injectable } from "inversify";
import { TYPES } from "./types";
import {MessageHandler} from "@services/message-handler";

@injectable()
export class Server {
    private client: Client;
    private readonly token: string;
    private readonly messageHandler: MessageHandler;

    constructor(
        @inject(TYPES.Client) client: Client,
        @inject(TYPES.Token) token: string,
        @inject(TYPES.MessageHandler) messageHandler: MessageHandler
    ) {
        this.client = client;
        this.token = token;
        this.messageHandler = messageHandler;
    }

    public listen(): Promise<string> {
        this.client.on('message', async (message: Message) => {
            console.log("Message received! Contents: ", message.content);
            await this.messageHandler.handleMessage(message)
                .catch(error => console.log("Could not handle message: " + error))
        });

        return this.client.login(this.token);
    }
}