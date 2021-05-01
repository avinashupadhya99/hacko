import { db } from './firebase';

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
