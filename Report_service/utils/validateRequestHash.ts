import pool from '../db/config';

import createHMACSHA256Hash from "../utils/createHMACSHA256Hash";
import { Request } from "express";

export default async function validateRequestHash(req: Request): Promise<boolean> {
    const timeStamp = new Date().toISOString();
    console.log('Executing method: validateRequestHash');
    
    try {
        const sessionId = req.headers['ecwx-session-id'] as string || '';
        const hashReceived = req.headers['ecwx-hash'] as string || '';
        console.log("Session ID Received:", sessionId);
        console.log("Hash Received:", hashReceived);

        // Validate fields
        const missingFields: string[] = [];
        if (!sessionId) missingFields.push('session_id');
        if (!hashReceived) missingFields.push('hash');
        if (missingFields.length > 0) {
            console.error(`[${timeStamp}] Missing fields: ${missingFields.join(', ')}\nRequest sent: ${JSON.stringify(req.body)}`);
            return false;
        }

        const client = await pool.connect();
        try {
            // Fetch session data from the database
            const sessionQuery = 'SELECT session_secret FROM session WHERE session_id = $1';
            const result = await client.query(sessionQuery, [sessionId]);

            if (result.rowCount === 0) {
                console.error(`Session data with id = [${sessionId}] not found in database\n`);
                return false;
            }

            const sessionSecret = result.rows[0].session_secret;
            const postBody = req.body;

            const postBodyString = JSON.stringify(postBody);
            const hashExpected = createHMACSHA256Hash(postBodyString, sessionSecret.toString());
            console.log("Session Secret from DB:", sessionSecret);
            console.log("Post Body from FE (stringify):", postBodyString);
            console.log(`Expected Hash: [${hashExpected}]`);
            console.log(`Received Hash from header: [${hashReceived}]`);

            return hashReceived === hashExpected;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error(`[${timeStamp}] Error while validating hash:`, error);
        return false;
    }
}