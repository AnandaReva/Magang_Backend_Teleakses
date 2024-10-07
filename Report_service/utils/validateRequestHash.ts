// utils/validateRequest.ts
import pool from '../db/config';
import { createHMACSHA256HashBase64 } from "./createHMACSHA256Hash";
import log from './logHelper';
import { globalVar } from './globalVar';

export default async function validateRequestHash(
    bot_id: string,
    session_id: string,
    hash: string,
    postBody: any
): Promise<{ botId: string, organizationId: string, userId: string } | null > {
    const referenceId = globalVar.getReferenceId();

    log(referenceId, '\nExecutign method: validateRequestHash');
    log(referenceId, "Session ID Received:", session_id);
    log(referenceId, "Hash Received:", hash);

    // Validate fields
    const missingFields: string[] = [];
    if (!session_id) missingFields.push('session_id');
    if (!hash) missingFields.push('hash');
    if (!bot_id) missingFields.push('bot_id');
    if (missingFields.length > 0) {
        log(referenceId, `Missing fields: ${missingFields.join(', ')}`, { postBody });
        return null;
    }

    
    const sessionQuery = 'SELECT a.session_secret, a.user_id, b.organization_id FROM servouser.session a LEFT JOIN servouser.user b ON b.id = a.user_id WHERE a.session_id = $1 LIMIT 1';
    log(referenceId, `Query to find session data and organization id: ${sessionQuery}`);

    const client = await pool.connect();
    
    try {

        const result = await client.query(sessionQuery, [session_id]);
        if (result.rowCount === 0) {
            log(referenceId, `Session data with id = [${session_id}] not found in database`);
            return null;
        }
        log(referenceId, "Result from session and organization query:", { rowCount: result.rowCount });

        const sessionSecret = result.rows[0].session_secret;
        const userId = result.rows[0].user_id;
        const organizationId = result.rows[0].organization_id;

        log(referenceId, `Session Secret: ${sessionSecret}`);
        log(referenceId, `User ID: ${userId}`);
        log(referenceId, `Organization ID: ${organizationId}`);
        log(referenceId, `Post Body:`, postBody);

        const postBodyString = JSON.stringify(postBody);
        const hashExpected = createHMACSHA256HashBase64(postBodyString, sessionSecret.toString());

        log(referenceId, "Session Secret from DB:", sessionSecret);
        log(referenceId, "Post Body from FE (stringify):", postBodyString);
        log(referenceId, `Expected Hash: [${hashExpected}]`);
        log(referenceId, `Received Hash from header: [${hash}]`);

        // validate hash
        if (hash !== hashExpected) {
            console.error(`referenceId Hash validation failed. Expected: [${hashExpected}],\n Received: [${hash}]`);
            return null;
        }

        log(referenceId, `Bot ID from request body: ${bot_id}`);
        log(referenceId, `User ID from DB: ${userId}`);
        log(referenceId, `User ID received: ${userId}`);

        // Return data
        return {
            botId: bot_id,
            organizationId: organizationId.toString(),
            userId: userId.toString()
        };
    } catch (error) {
        log(referenceId, `Error while validating hash:`, error);
        return null;
    } finally {
        client.release();
    }
}
