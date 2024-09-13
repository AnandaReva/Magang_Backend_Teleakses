//utils/generateRandomString.ts
import log from './logHelper';
import { globalVar } from './globalVar';


export default function generateRandomString(length: number): string {
    const referenceId = globalVar.getReferenceId();

    log(referenceId, "Executing method: generateRandomString");

    const charset = "abcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * charset.length);
        result += charset[randomIndex];
    }
    log(referenceId, "Random string result:", result);

    return result;
}