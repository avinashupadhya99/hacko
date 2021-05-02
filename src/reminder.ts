import { Client, TextChannel, MessageEmbed } from 'discord.js';
import config from './config';
import { IReminder } from "./interfaces/IReminder";
const { REMINDER_CHANNEL_ID } = config;

let deadline5Timer: ReturnType<typeof setTimeout>;
let deadline15Timer: ReturnType<typeof setTimeout>;
let event5Timer: ReturnType<typeof setTimeout>;

let gitNotifications: ReturnType<typeof setInterval>;

export const setReminder = (reminder: IReminder) => {
    if(!REMINDER_CHANNEL_ID) {
        console.error("Reminders channel not found. Make sure to setup REMINDER_CHANNEL_ID env variable.")
        return;
    }
    if(reminder.time < 0) {
        console.error(`Reminder time elapsed for ${reminder.type} with time ${reminder.time}`);
    }
    switch(reminder.type) {
        case 'DEADLINE5':
            deadline5Timer = setTimeout(() => {
                const embed =new MessageEmbed()
                    .setTitle('Deadline reminder')
                    .setDescription(`Deadline aproaching in 5 minutes!`)
                    .setColor('#FFFF00')
                    .setTimestamp();
                const reminderChannel = reminder.client.channels.cache.get(`${REMINDER_CHANNEL_ID}`);
                (<TextChannel> reminderChannel).send(embed);
            }, reminder.time);
        break;
        case 'DEADLINE15':
            deadline15Timer = setTimeout(() => {
                const embed =new MessageEmbed()
                    .setTitle('Deadline reminder')
                    .setDescription(`Deadline aproaching in 15 minutes!`)
                    .setColor('#FFFF00')
                    .setTimestamp();
                const reminderChannel = reminder.client.channels.cache.get(`${REMINDER_CHANNEL_ID}`);
                (<TextChannel> reminderChannel).send(embed);
            }, reminder.time);
        break;
        case 'EVENT5':
            deadline5Timer = setTimeout(() => {
                const embed =new MessageEmbed()
                    .setTitle('Event reminder')
                    .setDescription(`Event in 5 minutes!\n**Event name**: ${reminder.additionalInfo.name}\n**Event link**: ${reminder.additionalInfo.link ? reminder.additionalInfo.link : 'None'}`)
                    .setColor('#FFFF00')
                    .setTimestamp();
                const reminderChannel = reminder.client.channels.cache.get(`${REMINDER_CHANNEL_ID}`);
                (<TextChannel> reminderChannel).send(embed);
            }, reminder.time);
        break;
    }
}

export const clearReminder = (reminderType: string) => {
    switch(reminderType) {
        case 'DEADLINE5':
            clearTimeout(deadline5Timer);
        break;
    }
}

export const startGitNotifications = (client: Client) => {
    gitNotifications = setInterval(() => {
        const embed =new MessageEmbed()
                    .setTitle('Git reminder')
                    .setDescription(`This is your friendly git reminder. Please remember to commit as soon as you have a tiny working feature`)
                    .setColor('#FFFF00')
                    .setFooter('You can turn this off using `?git off`')
                    .setTimestamp();
        const reminderChannel = client.channels.cache.get(`${REMINDER_CHANNEL_ID}`);
        (<TextChannel> reminderChannel).send(embed);
    }, 2 * 60 * 60 * 10000); // 2 hours
}

export const stopGitNotifications = () => {
    clearInterval(gitNotifications);
}