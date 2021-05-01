import { Client } from "discord.js";

export interface IReminder {
    type: string,
    time: number,
    client: Client
}