import { db } from './firebase';

export async function getEvents() {
    const querySnapshot = await db.collection('events').get();
    querySnapshot.docs.forEach(event => {
        console.log(event.id);
    });

}
