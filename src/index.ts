require('dotenv').config();
import container from "./inversify.config";
import { TYPES } from "@src/types";
import { Server } from "@src/server";

let bot = container.get<Server>(TYPES.Server);
bot.listen().then(() => {
    console.log('Logged in!')
}).catch((error) => {
    console.log('Oh no! ', error)
});