import * as dotenv from 'dotenv';
dotenv.config();

import config from './config';
import * as database from './database';
import * as deadline from './deadline';
import { IEvent } from "./interfaces/IEvent";
import { IEvents } from "./interfaces/IEventArray";
import { IMotivationalQuote } from "./interfaces/IMotivationalQuote";
import { setReminder, startGitNotifications, stopGitNotifications } from './reminder';
const { TIMEZONES } = config;

import { Client, MessageEmbed } from 'discord.js';
import fetch from 'node-fetch';
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
    });
    database.getEvents().then((events: IEvents) => {
        events.forEach((event: Event) => {
            setReminder({
                type: 'EVENT5',
                time: (event.time - new Date().getTime() - 300000),
                client: client,
                additionalInfo: {
                    name: event.name,
                    link: event.link
                }
            });
        });
    }).catch(err => {
        console.error(err);
    });
    database.getGitNotifications().then(value => {
        if(value) {
            startGitNotifications(client);
        }
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
                        setReminder({
                            type: 'EVENT5',
                            time: (eventMilliSeconds - new Date().getTime() - 300000),
                            client: client,
                            additionalInfo: {
                                name: args[0],
                                link: args[2]
                            }
                        });
                        const embed =new MessageEmbed()
                                .setTitle('Event information recorded')
                                .setDescription(`**Event name**: ${args[0]}\n**Event time**: ${args[1]}\n**Event link**: ${args[2] ? args[2] : 'None'}`)
                                .setColor('#800080')
                                .setTimestamp();
                        return message.channel.send(embed);
                    }).catch(err => {
                        console.error(err);
                        return message.reply("Something went wrong while setting event");
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
                                const currentDate: Date = new Date();
                                const currentTime = currentDate.toLocaleTimeString('en-US', { timeZone: timezone });
                                const embed =new MessageEmbed()
                                    .setTitle('Timezone')
                                    .setDescription(`Timezone for @${mentionedUser.username} is ${timezone}\nThe current time is \`${currentTime}\``)
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
                        } else if(args[0] === 'all') {
                            database.getAllTimezones().then((timezones: {userID: string, timezone: string}[]) => {
                                // TODO: Handle message length
                                const embed =new MessageEmbed()
                                    .setTitle('Timezones of all hackers')
                                    .setColor('#0099ff')
                                    .setTimestamp();
                                timezones.forEach((timezone: {userID: string, timezone: string}) => {
                                    const user: User = client.users.cache.get(timezone.userID);
                                    const currentTime: string = new Date().toLocaleTimeString('en-US', { timeZone: timezone.timezone });
                                    embed.addField(`@${user.username}`, `${timezone.timezone}  ${currentTime}`);
                                });
                                return message.channel.send(embed);
                            }).catch(err => {
                                if(err.code && err.code === 'EMPTY') {
                                    const embed =new MessageEmbed()
                                        .setTitle('No Timezones')
                                        .setDescription(`No timezones configured`)
                                        .setColor('#FFA500')
                                        .setTimestamp();
                                    return message.channel.send(embed);
                                } else {
                                    console.error(err);
                                    return message.reply("Something went wrong while fetching timezones. We are sorry");
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

                case 'events':
                    let title = 'Upcoming events';
                    let options;
                    if(args.length === 1) {
                        if(args[0] === 'all') {
                            options = {all: true};
                            title = 'All Events';
                        } else {
                            return message.reply("Use `?events all` to view all events or `?events` to view all upcoming events");
                        }
                    } 
                    database.getEvents(options).then((events: IEvents) => {
                        // TODO: Handle message length
                        let description = '';
                        events.forEach(event => {
                            description += `**Event name**: ${event.name}\n**Event time**: ${new Date(event.time).toUTCString()}\n**Event link**: ${event.link ? event.link : 'None'}\n\n`
                        })
                        const embed =new MessageEmbed()
                            .setTitle(title)
                            .setDescription(description)
                            .setColor('#FFA500')
                            .setTimestamp();
                        return message.channel.send(embed);
                    }).catch(err => {
                        if(err.code && err.code === 'EMPTY') {
                            const embed =new MessageEmbed()
                                .setTitle('No Events')
                                .setDescription(`No events configured`)
                                .setColor('#FFA500')
                                .setTimestamp();
                            return message.channel.send(embed);
                        } else {
                            console.error(err);
                            return message.reply("Something went wrong while fetching events. We are sorry");
                        }
                    })
                break;

                case 'clear':
                    if(args.length != 1) {
                        return message.reply('Clear command expects 1 argument. It can be either `events` or `deadline`')
                    }
                    switch(args[0]) {
                        case 'events':

                        break;

                        case 'deadline':

                        break;
                        default:
                            return message.reply(`Cannot clear \`${args[0]}\`. It can be either \`events\` or \`deadline\``)
                        break;
                    }
                break;

                case 'git':
                    if(args.length != 1) {
                        return message.reply('git command expects 1 argument. It can be either `on` or `off`')
                    }
                    switch(args[0]) {
                        case 'on':
                            database.setGitNotifications(true).then(() => {
                                startGitNotifications(client);
                                return message.reply("Git notifications turned on. You will be notified every 2 hours to commit");
                            });
                        break;

                        case 'off':
                            database.setGitNotifications(false).then(() => {
                                stopGitNotifications();
                                return message.reply("Git notifications turned off");
                            });
                        break;
                        default:
                            return message.reply(`Cannot set git notifications \`${args[0]}\`. It can be either \`on\` or \`off\``)
                        break;
                    }
                break;

                case 'motivate':
                    api<IMotivationalQuote>('https://api.quotable.io/random?tags=technology%7Cinspirational%7Csuccess%7Cscience')
                    .then((data: IMotivationalQuote) => {
                        const embed =new MessageEmbed()
                            .setTitle('Your motivational quote!')
                            .setDescription(`${data.content}\n~${data.author}`)
                            .setColor('#008000')
                            .setTimestamp();
                        message.channel.send(embed);
                    })
                    .catch(apiError => {
                        console.error(apiError);
                        message.reply('Sorry something went wrong and we cannot provide a quote right now, but you got this! :thumbsup:')
                    })
                break;

                case 'resources':
                    if(args.length > 0) {
                        const resource = args.join(' ');
                        database.storeResource(resource).then(() => {
                            const embed =new MessageEmbed()
                                .setTitle('Resource stored')
                                .setDescription(`${resource} stored successfully`)
                                .setColor('#FFC0CB')
                                .setTimestamp();
                            return message.channel.send(embed);
                        }).catch(err => {
                            console.error(err);
                            return message.reply("Something went wrong while storing the resource");
                        });
                    } else {
                        database.getResources().then((resources: string[]) => {
                            // TODO: Handle message length
                            const embed =new MessageEmbed()
                                .setTitle('Resources')
                                .setDescription(resources)
                                .setColor('#FFC0CB')
                                .setTimestamp();
                            return message.channel.send(embed);
                        }).catch(err => {
                            if(err.code && err.code === 'EMPTY') {
                                const embed =new MessageEmbed()
                                    .setTitle('No Resources')
                                    .setDescription(`No resources added.\nUse \`?resources <resource>\` to add new resources`)
                                    .setColor('#FFC0CB')
                                    .setTimestamp();
                                return message.channel.send(embed);
                            } else {
                                console.error(err);
                                return message.reply("Something went wrong while fetching resources. We are sorry");
                            }
                        })
                    }
                break;

                case 'help':
                    const embed =new MessageEmbed()
                        .setTitle('Help menu')
                        .setDescription(`List of commands available`)
                        .addFields(
                            {name: 'set_deadline', value: 'Set a deadline for project submission and be notified at appropriate times'},
                            {name: 'set_event', value: 'Set reminders for events happenning at the hackathon'},
                            {name: 'timezone', value: 'Set timezone for hackers and view timezones'},
                            {name: 'time_left', value: 'Get the time left for the deadline'},
                            {name: 'events', value: 'Get all events added'},
                            {name: 'git', value: 'Turn on/off notifications for committing code to git'},
                            {name: 'motivate', value: 'Get a motivational quote to stay motivated'},
                            {name: 'resources', value: 'Store resources and access them any time'},
                            {name: 'clear', value: 'Clear deadlines and events'},
                        )
                        .setColor('#ff0000')
                        .setTimestamp();
                    message.channel.send(embed);
                break;

                default:
                    return message.reply('Command not found. Use `?help` for help with commands')
            }
        }
    } else {
        message.mentions.users.forEach(user => {
            if(!user.bot) {
                database.getTimezone(user.id).then(timezone => {
                    const currentDate: Date = new Date();
                    const currentTime = currentDate.toLocaleTimeString('it-IT', { timeZone: timezone });
                    const hour = Number(currentTime.split(":")[0]);
                    if(hour>=23 || hour<=7) {
                        message.channel.send(`\`It's ${currentDate.toLocaleTimeString('en-US', { timeZone: timezone })} for ${user.username}. Hacker might be sleeping \`:stuck_out_tongue_winking_eye:`);
                    }
                });
            }
        })
    }
});

// Function to call APIs
function api<T>(url: string): Promise<T> {
    return fetch(url)
    .then(response => {
        if (!response.ok) {
            throw new Error(response.statusText)
        }
        return response.json<T>()
    })

}

client.login(process.env.DISCORD_BOT_TOKEN);