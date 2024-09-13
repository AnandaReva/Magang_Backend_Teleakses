import { createHMACSHA256HashBase64 } from "./createHMACSHA256Hash";
import log from './logHelper';
import { globalVar } from './globalVar';


export default function calculateChallengeResponse(full_nonce: string, salted_password: string): string {
    const referenceId = globalVar.getReferenceId();

    log(referenceId, "Executing method: calculateChallengeResponse");
    log(referenceId, `Full Nonce: ${full_nonce}`);
    log(referenceId, `Salted Password: ${salted_password}`);

    const challengeResponse = createHMACSHA256HashBase64(full_nonce, salted_password);
    log(referenceId, "Challenge Response generated:", challengeResponse);
    return challengeResponse;
}


