require('dotenv').config();

const { Client } = require('discord.js');
const client = new Client();

client.on('ready', () => {
    console.log('Bot started');
});

client.on('message', message => {
    if(message.content.startsWith('?')) {
        message.channel.send('Works');
    }
});

client.login(process.env.DISCORD_BOT_TOKEN);