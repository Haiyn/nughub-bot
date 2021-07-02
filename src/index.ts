require('dotenv').config();
import container from "./inversify.config";
import { TYPES } from "./types";
import { Server } from "./server";

let bot = container.get<Server>(TYPES.Server);
bot.listen().then(() => {
    console.log('Logged in!')
}).catch((error) => {
    console.log('Oh no! ', error)
});