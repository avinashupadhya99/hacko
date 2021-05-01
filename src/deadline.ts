export const convertDateTime = (date: string, time: string, timezone: string): number => {
    const newDate: Date = new Date(`${date} ${time} UTC`);
    const tz: string[] = timezone.split(":");
    const timezoneDifference: number = Number(tz[0].substring(1))*60*60*1000 + Number(tz[1])*60*1000;
    if(tz[0].charAt(0) === '+') {
        return newDate.getTime() - timezoneDifference;
    }
    return newDate.getTime() + timezoneDifference;
}

export const getTimeRemaining = (deadline: number): number => {
    const date: Date = new Date();
    let timeRemaining: number = deadline - date.getTime();
    timeRemaining = timeRemaining / (1000 * 60 * 60);
    return Math.round(timeRemaining);
};