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
