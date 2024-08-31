import { createHmac } from "crypto";

export default function createHMACSHA256Hash(data: string, key: string): string {
    console.log("Executing method: createHMACSHA256Hash");
    console.log(`[ Data: ${data}]`);
    console.log(`[ Key: ${key}]`);

    const hmacSHA256Hash = createHmac('sha256', key)
        .update(data)
        .digest('base64');
    console.log("[HMAC SHA256 result: ", hmacSHA256Hash, "] \n ----------------");
    return hmacSHA256Hash;
}