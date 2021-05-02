import * as dotenv from 'dotenv';
dotenv.config();

import config from './config';
import * as database from './database';
import * as deadline from './deadline';
import { IEvent } from "./interfaces/IEvent";
import { setReminder } from './reminder';
const { TIMEZONES } = config;

import { Client, MessageEmbed } from 'discord.js';
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
        if(message.content.startsWith(PREFIX+'set_event')) {
            const [CMD_NAME, ...args] = message.content.trim().substring(PREFIX.length).split("\n");
            if(CMD_NAME === 'set_event') {
                if(args.length < 2 || args.length > 3) {
                    return message.reply('Please provide the `event name`, `event time` in the format MM-DD-YYYY HH:mm GMT +/- xx:yy and `event link` *(optional)* in new lines');
                }
                const eventTime = args[1].split(/\s+/);
                if(eventTime.length !== 4) {
                    return message.reply('Please provide the event time in the format MM-DD-YYYY HH:mm GMT +/- xx:yy');
                }
                if(dateRegex.test(eventTime[0]) && timeRegex.test(eventTime[1]) && eventTime[2] === 'GMT' && timeZoneRegex.test(eventTime[3]) ) {
                    const eventMilliSeconds: number = deadline.convertDateTime(eventTime[0], eventTime[1], eventTime[3]);
                    if(eventMilliSeconds < new Date().getTime()) {
                        return message.reply("The event time has passed. Are you sure it is the correct event time?");
                    }
                    database.setEvent({
                        name: args[0],
                        time: eventMilliSeconds,
                        link: args[2] ? args[2] : ''
                    }).then(() => {
                        const embed =new MessageEmbed()
                                .setTitle('Event information recorded')
                                .setDescription(`**Event name**: ${args[0]}\n**Event time**: ${args[1]}\n**Event link**: ${args[2] ? args[2] : 'None'}`)
                                .setColor('#800080')
                                .setTimestamp();
                        return message.channel.send(embed);
                    }).catch(err => {
                        console.error(err);
                        return message.reply("Something went wrong while setting timezone");
                    });
        } else {
                    return message.reply("Please provide the event time in the format MM-DD-YYYY HH:mm GMT +/- xx:yy");
                }
            } else {
                return message.reply('Command not found. Use `?help` for help with commands');
            }
        } else {
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

                case 'timezone':
                    if(args.length === 0) {
                        const embed =new MessageEmbed()
                            .setTitle('All timezones')
                            .setDescription("You can find the list of timezones at http://worldtimeapi.org/timezones.\n Use `?timezone help` for help with the command")
                            .setColor('#0099ff')
                            .setTimestamp();
                        message.channel.send(embed);
                    } else if(args.length === 1) {
                        let mention = args[0];
                        if (mention.startsWith('<@') && mention.endsWith('>')) {
                            mention = mention.slice(2, -1);
                            if (mention.startsWith('!')) {
                                mention = mention.slice(1);
                            }
                            const mentionedUser: User = client.users.cache.get(mention);
                            database.getTimezone(mention).then(timezone => {
                                const embed =new MessageEmbed()
                                    .setTitle('Timezone')
                                    .setDescription(`Timezone for @${mentionedUser.username} is ${timezone}`)
                                    .setColor('#0099ff')
                                    .setTimestamp();
                                message.channel.send(embed);
                            }).catch(err => {
                                if(err.code && err.code === 'NOT_FOUND') {
                                    const embed =new MessageEmbed()
                                        .setTitle('Timezone Not Set')
                                        .setDescription(`Timezone for @${mentionedUser.username} is not set.\nUse \`?timezone @${mentionedUser.username} <timezone>\` to set the timezone for the user`)
                                        .setColor('#0099ff')
                                        .setTimestamp();
                                    return message.channel.send(embed);
                                } else {
                                    return message.reply("Something went wrong while fetching deadline. We are sorry");
                                }
                            })
                        } else {
                            return message.reply('Mention an user whose timezone you want to know');
                        }
                    } else if(args.length === 2) {
                        let mention = args[0];
                        if (mention.startsWith('<@') && mention.endsWith('>')) {
                            const timezone = args[1];
                            if(!TIMEZONES.includes(timezone)) {
                                return message.reply('Timezone not recognised\nUse `?timezone` to check the list of timezones OR use `?timezone help` for help with the command');
                            }
                            mention = mention.slice(2, -1);
                            if (mention.startsWith('!')) {
                                mention = mention.slice(1);
                            }
                            const mentionedUser: User = client.users.cache.get(mention);
                            database.setTimezone(mention, timezone).then(() => {
                                const embed =new MessageEmbed()
                                        .setTitle('Timezone Not Set')
                                        .setDescription(`Timezone for @${mentionedUser.username} is set to ${timezone}`)
                                        .setColor('#0099ff')
                                        .setTimestamp();
                                return message.channel.send(embed);
                            }).catch(err => {
                                console.error(err);
                                return message.reply("Something went wrong while setting timezone");
                            });

                        } else {
                            return message.reply('Mention an user whose timezone you want to know');
                        }
                    } else {
                        return message.reply('Use `?timezone help` for help with the command');
                    }
                break;

                default:
                    return message.reply('Command not found. Use `?help` for help with commands')
            }
        }
    }
});

client.login(process.env.DISCORD_BOT_TOKEN);