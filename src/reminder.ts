import { TextChannel } from 'discord.js';
import config from './config';
import { IReminder } from "./interfaces/IReminder";
const { REMINDER_CHANNEL_ID } = config;

let deadline5Timer: ReturnType<typeof setTimeout>;

export const setReminder = (reminder: IReminder) => {
    if(!REMINDER_CHANNEL_ID) {
        console.error("Reminders channel not found. Make sure to setup REMINDER_CHANNEL_ID env variable.")
        return;
    }
    switch(reminder.type) {
        case 'DEADLINE5':
            deadline5Timer = setTimeout(() => {
                const reminderChannel = reminder.client.channels.cache.get(`${REMINDER_CHANNEL_ID}`);
                (<TextChannel> reminderChannel).send(`Deadline aproaching in 5 minutes!`);
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