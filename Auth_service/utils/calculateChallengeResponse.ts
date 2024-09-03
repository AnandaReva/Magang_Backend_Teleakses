import createHMACSHA256Hash from "./createHMACSHA256Hash";

export default function calculateChallengeResponse(full_nonce: string, salted_password: string): string {
    console.log("Executing method: calculateChallengeResponse");
    console.log(`[Full Nonce: ${full_nonce}]`);
    console.log(`[Salted Password: ${salted_password}]`);

    // Calculate the challenge response using HMAC SHA256 hash
    const challengeResponse = createHMACSHA256Hash(full_nonce, salted_password);

    console.log("[Challenge Response generated: ", challengeResponse, "] \n ----------------");
    return challengeResponse;
}

