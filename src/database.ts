import { db } from './firebase';
import { IEvent } from "./interfaces/IEvent";
import { IEvents } from "./interfaces/IEventArray";

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

export const getAllTimezones = (): Promise<{userID: string, timezone: string}[]> => {
    return new Promise<{userID: string, timezone: string}[]>(async (resolve, reject) => {
        try {
            const res = await db.collection('timezones').get();
            if (res.empty) {
                reject({code: 'EMPTY', error: 'No timezones configured'});
            }
            let timezones: {userID: string, timezone: string}[] = [];
            res.forEach(doc => {
                timezones.push({userID: doc.id, timezone: doc.data()['timezone']});
            });
            resolve(timezones);
        } catch(exception) {
            reject({code: 'UNKNOWN', error: exception});
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

export const getEvents = (options): Promise<Events> => {
    return new Promise<Events>(async (resolve, reject) => {
        try {
            let res;
            if(options && options.all) {
                res = await db.collection('events').get();
            } else {
                res = await db.collection('events').where('time', '>=', new Date().getTime()).get();
            }
            if (res.empty) {
                reject({code: 'EMPTY', error: 'No events configured'});
            }
            let events = [];
            res.forEach(doc => {
                events.push(doc.data());
            });
            resolve(events);
        } catch(exception) {
            reject({code: 'UNKNOWN', error: exception});
        }
    });    
}

export const setGitNotifications = (value: boolean): Promise<void> => {
    return new Promise<void>(async (resolve, reject) => {
        try {
            await db.collection('data').doc('git').set({notifications: value});
            resolve();
        } catch(exception) {
            reject(exception);
        }
    });
}

export const getGitNotifications = async (): boolean => {
    const res = await db.collection('data').doc('git').get();
    return res.exists && res.data()['notifications'];
}

export const storeResource = async(resource: string): Promise<void> => {
    return new Promise<void>(async (resolve, reject) => {
        try {
            await db.collection('resources').add({
                resource
            })
            resolve();
        } catch(exception) {
            reject(exception);
        }
    });
}

export const getResources = (): Promise<string[]> => {
    return new Promise<string[]>(async (resolve, reject) => {
        try {
            const res = await db.collection('resources').get();
            if (res.empty) {
                reject({code: 'EMPTY', error: 'No resources configured'});
            }
            let resources: string[] = [];
            res.forEach(doc => {
                resources.push(doc.data()['resource']);
            });
            resolve(resources);
        } catch(exception) {
            reject({code: 'UNKNOWN', error: exception});
        }
    });    
}
