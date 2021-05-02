import { db } from './firebase';
import { IEvent } from "./interfaces/IEvent";

export const getEvents = async() => {
    const querySnapshot = await db.collection('events').get();
    querySnapshot.docs.forEach(event => {
        console.log(event.id);
    });
}

export const setDeadline = (deadline: number): Promise<void> => {
    return new Promise<void>(async (resolve, reject) => {
        try {
            const res = await db.collection('data').doc('deadline').set({deadline});
            resolve();
        } catch(exception) {
            reject(exception);
        }
    });    
}

export const getDeadline = (): Promise<number> => {
    return new Promise<number>(async (resolve, reject) => {
        try {
            const res = await db.collection('data').doc('deadline').get();
            if (!res.exists) {
                reject({code: 'NOT_FOUND', error: 'Deadline not set'});
            }
            const deadline: number = Number(res.data()?.['deadline']);
            resolve(deadline);
        } catch(exception) {
            reject({code: 'UNKNOWN', error: exception});
        }
    });    
}

export const getTimezone = (userID: string): Promise<string> => {
    return new Promise<string>(async (resolve, reject) => {
        try {
            const res = await db.collection('timezones').doc(userID).get();
            if (!res.exists) {
                reject({code: 'NOT_FOUND', error: 'Timezone not set'});
            }
            const timezone: string = res.data()['timezone'];
            resolve(timezone);
        } catch(exception) {
            reject({code: 'UNKNOWN', error: exception});
        }
    })
}

export const setTimezone = (userID: string, timezone: string): Promise<void> => {
    return new Promise<void>(async (resolve, reject) => {
        try {
            await db.collection('timezones').doc(userID).set({timezone});
            resolve();
        } catch(exception) {
            reject(exception);
        }
    });    
}

export const setEvent = (event: Event): Promise<void> => {
    return new Promise<void>(async (resolve, reject) => {
        try {
            await db.collection('events').doc(event.name).set({
                name: event.name,
                time: event.time,
                link: event.link
            })
            resolve();
        } catch(exception) {
            reject(exception);
        }
    })
}
