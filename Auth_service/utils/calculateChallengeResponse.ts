import {createHMACSHA256HashBase64} from "./createHMACSHA256Hash";
export default function calculateChallengeResponse(full_nonce: string, salted_password: string): string {
    console.log("Executing method: calculateChallengeResponse");
    console.log(`[Full Nonce: ${full_nonce}]`);
    console.log(`[Salted Password: ${salted_password}]`);
    const challengeResponse = createHMACSHA256HashBase64(full_nonce, salted_password);
    console.log("[Challenge Response generated: ", challengeResponse, "] \n ----------------");
//    console.log("coba1")
    return challengeResponse;
}


