import * as dotenv from 'dotenv';
dotenv.config();

import * as database from './database';
import * as deadline from './deadline';

import { Client } from 'discord.js';
import { setReminder } from './reminder';
const client = new Client();
const PREFIX: string = '?';


const dateRegex = /^((0?[1-9]|1[012])[- /.](0?[1-9]|[12][0-9]|3[01])[- /.](19|20)?[0-9]{2})*$/;
const timeRegex = /^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/;
const timeZoneRegex = /^(?:Z|[+-]([01]?[0-9]):[0-5][0-9])$/;

client.on('ready', () => {
    console.log('Bot started');
    database.getDeadline().then(deadlineMilliSeconds => {
        if(deadlineMilliSeconds > new Date().getTime()) {
            setReminder({
                type: 'DEADLINE5',
                time: (deadlineMilliSeconds - new Date().getTime() - 300000),
                client: client
            });
            setReminder({
                type: 'DEADLINE15',
                time: (deadlineMilliSeconds - new Date().getTime() - 900000),
                client: client
            });
        }
    }).catch(err => {
        console.error(err);
    })

});

client.on('message', message => {
    if(message.author.bot) return;
    if(message.content.startsWith(PREFIX)) {
        const [CMD_NAME, ...args] = message.content.trim().substring(PREFIX.length).split(/\s+/);
        switch(CMD_NAME) {
            case 'set_deadline':
                if(args.length !== 4) {
                    return message.reply('Please provide the time in the format MM-DD-YYYY HH:mm GMT +/- xx:yy');
                }
                const deadlineDate = args[0];
                const deadlineTime = args[1];
                const timeZone = args[3];
                if(dateRegex.test(deadlineDate) && timeRegex.test(deadlineTime) && args[2] === 'GMT' && timeZoneRegex.test(timeZone) ) {
                    const deadlineMilliSeconds: number = deadline.convertDateTime(deadlineDate, deadlineTime, timeZone);
                    const timeRemaining: number = deadline.getTimeRemaining(deadlineMilliSeconds);
                    if(timeRemaining >= 0) {
                        database.setDeadline(deadlineMilliSeconds).then(() => {
                            setReminder({
                                type: 'DEADLINE5',
                                time: (deadlineMilliSeconds - new Date().getTime() - 300000),
                                client: client
                            });
                            setReminder({
                                type: 'DEADLINE15',
                                time: (deadlineMilliSeconds - new Date().getTime() - 900000),
                                client: client
                            });
                            return message.reply(`Deadline set for ${timeRemaining} hours from now`);
                        }).catch(err => {
                            return message.reply("Something went wrong while setting deadline");
                        });
                    } else {
                        return message.reply("The deadline has passed. Are you sure it is the correct deadline?");
                    }
                } else {
                    return message.reply("Please provide the time in the format MM-DD-YYYY HH:mm GMT +/- xx:yy");
                }
                break;
            case 'time_left':
                database.getDeadline().then(deadlineMilliSeconds => {
                    const timeRemaining: number = deadline.getTimeRemaining(deadlineMilliSeconds);
                    if(isNaN(timeRemaining)) {
                        return message.reply("Something went wrong while fetching deadline. We are sorry. Try setting the deadline again");
                    }
                    if(timeRemaining >= 0)
                        return message.reply(`Deadline is at ${timeRemaining} hours from now`);
                    return message.reply(`Already passed deadline`);
                }).catch(err => {
                    if(err.code && err.code === 'NOT_FOUND') {
                        return message.reply('Deadline not set. Use `?set_deadline MM-DD-YYYY HH:mm GMT +/- xx:yy` to set the deadline');
                    } else {
                        return message.reply("Something went wrong while fetching deadline. We are sorry");
                    }
                })

            break;
            default:
                return message.reply('Command not found. Use `?help` for help with commands')
        }
    }
});

client.login(process.env.DISCORD_BOT_TOKEN);