export default function log(reference_id: string, text: string, param?: any) {
    const timestamp = new Date().toISOString();



    if (param == null || typeof param === 'undefined') {
        console.log(`${timestamp} - ${reference_id} - ${text}`);
    } else {
        console.log(`${timestamp} - ${reference_id} - ${text}`, param);
    }
}
