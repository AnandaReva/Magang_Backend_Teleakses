import { createHmac } from "crypto";
import log from './logHelper';
import { globalVar } from './globalVar';

// Function to generate HMAC SHA256 hash in Base64
export function createHMACSHA256HashBase64(data: string, key: string): string {
    const referenceId = globalVar.getReferenceId();

    log(referenceId, "Executing method: createHMACSHA256HashBase64");
    log(referenceId, `Data:`, data);
    log(referenceId, `Key:`, key);

    const hmacSHA256Hash = createHmac('sha256', key)
        .update(data)
        .digest('base64');
    log(referenceId, "HMAC SHA256 Base64 result:", hmacSHA256Hash);
    log(referenceId, "\n ----------------");
    return hmacSHA256Hash;
}

// Function to generate HMAC SHA256 hash in Hex
export function createHMACSHA256HashHex(data: string, key: string): string {
    const referenceId = globalVar.getReferenceId();

    log(referenceId, "Executing method: createHMACSHA256HashHex");
    log(referenceId, `Data:`, data);
    log(referenceId, `Key:`, key);

    const hmacSHA256Hash = createHmac('sha256', key)
        .update(data)
        .digest('hex');
    log(referenceId, "HMAC SHA256 Hex result:", hmacSHA256Hash);
    log(referenceId, "\n ----------------");
    return hmacSHA256Hash;
}
