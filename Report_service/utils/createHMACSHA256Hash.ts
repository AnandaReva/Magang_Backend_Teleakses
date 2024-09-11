import { createHmac } from "crypto";

// Function to generate HMAC SHA256 hash in Base64
export function createHMACSHA256HashBase64(data: string, key: string): string {
    console.log("Executing method: createHMACSHA256HashBase64");
    console.log(` Data: [${data}]`);
    console.log(` Key: [${key}]`);

    const hmacSHA256Hash = createHmac('sha256', key)
        .update(data)
        .digest('base64');
    console.log("[HMAC SHA256 Base64 result: ", hmacSHA256Hash, "] \n ----------------");
    return hmacSHA256Hash;
}

// Function to generate HMAC SHA256 hash in Hex
export function createHMACSHA256HashHex(data: string, key: string): string {
    console.log("Executing method: createHMACSHA256HashHex");
    console.log(` Data: [${data}]`);
    console.log(` Key: [${key}]`);

    const hmacSHA256Hash = createHmac('sha256', key)
        .update(data)
        .digest('hex');
    console.log("[HMAC SHA256 Hex result: ", hmacSHA256Hash, "] \n ----------------");
    return hmacSHA256Hash;
}
