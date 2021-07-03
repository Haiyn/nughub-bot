import "reflect-metadata";
import { Client } from "discord.js";
import { Container } from "inversify";
import { MessageHandler, PrefixFinder, BotFinder, PermissionHandler } from "@services/index";
import { TYPES } from "@src/types";
import { Server } from "@src/server";

let container = new Container();

// Discord.js
container.bind<Client>(TYPES.Client).toConstantValue(new Client());

// Internal
container.bind<Server>(TYPES.Server).to(Server).inSingletonScope();
container.bind<MessageHandler>(TYPES.MessageHandler).to(MessageHandler).inSingletonScope();
container.bind<PrefixFinder>(TYPES.PrefixFinder).to(PrefixFinder).inSingletonScope();
container.bind<BotFinder>(TYPES.BotFinder).to(BotFinder).inSingletonScope();
container.bind<PermissionHandler>(TYPES.PermissionHandler).to(PermissionHandler).inSingletonScope();

// Environment
container.bind<string>(TYPES.Token).toConstantValue(process.env.TOKEN);
container.bind<string>(TYPES.Prefix).toConstantValue(process.env.PREFIX);

export default container;