import * as dotenv from 'dotenv';
dotenv.config();

import * as database from './database';

import { Client } from 'discord.js';
const client = new Client();
const PREFIX: string = '?';

client.on('ready', () => {
    console.log('Bot started');
    database.getEvents();
});

client.on('message', message => {
    if(message.author.bot) return;
    if(message.content.startsWith(PREFIX)) {
        const [CMD_NAME, ...args] = message.content.trim().substring(PREFIX.length).split(/\s+/);
        switch(CMD_NAME) {
            case 'set_deadline':
                break;
        }
    }
});

client.login(process.env.DISCORD_BOT_TOKEN);