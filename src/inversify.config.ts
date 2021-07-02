import "reflect-metadata";
import { Client } from "discord.js";
import { Container } from "inversify";
import { TYPES } from "types";
import { Server } from "server";
import { MessageHandler, PrefixFinder } from "@services/index";

let container = new Container();

// Discord.js
container.bind<Client>(TYPES.Client).toConstantValue(new Client());

// Internal
container.bind<Server>(TYPES.Server).to(Server).inSingletonScope();
container.bind<MessageHandler>(TYPES.MessageHandler).to(MessageHandler).inSingletonScope();
container.bind<PrefixFinder>(TYPES.PrefixFinder).to(PrefixFinder).inSingletonScope();

// Environment
container.bind<string>(TYPES.Token).toConstantValue(process.env.TOKEN);
container.bind<string>(TYPES.Prefix).toConstantValue(process.env.PREFIX);

export default container;