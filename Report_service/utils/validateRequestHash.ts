import pool from '../db/config';
import createHMACSHA256Hash from "../utils/createHMACSHA256Hash";
import { Request } from "express";

export default async function validateRequestHash(req: Request): Promise<{ botId: string, userId: string } | "0"> {
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
            return "0";
        }

        const client = await pool.connect();
        try {
            const sessionQuery = 'SELECT session_secret, user_id FROM servouser.session WHERE session_id = $1 LIMIT 1';
            console.log(`sessionQuery: ${sessionQuery}`);
            const result = await client.query(sessionQuery, [sessionId]);

            if (result.rowCount === 0) {
                console.error(`[${timeStamp}] Session data with id = [${sessionId}] not found in database`);
                return "0";
            }

            const sessionSecret = result.rows[0].session_secret;
            const userId = result.rows[0].user_id;
            const postBody = req.body;

            console.log(`sessionSecret: ${sessionSecret}`);
            console.log(`userId: ${userId}`);
            console.log(`postBody: ${JSON.stringify(postBody)}`);

            const postBodyString = JSON.stringify(postBody);
            const hashExpected = createHMACSHA256Hash(postBodyString, sessionSecret.toString());
            console.log("Session Secret from DB:", sessionSecret);
            console.log("Post Body from FE (stringify):", postBodyString);
            console.log(`Expected Hash: [${hashExpected}]`);
            console.log(`Received Hash from header: [${hashReceived}]`);

            if (hashReceived !== hashExpected) {
                return "0";
            }

            const botId = postBody.data?.bot_id;
            if (!botId) {
                console.error(`[${timeStamp}] Bot ID not found in request body`);
                return "0";
            }

            console.log(`User ID from DB: ${userId}`);
            console.log(`User ID received: ${userId}`);

            return {
                botId: botId,
                userId: userId.toString()
            };
        } finally {
            client.release();
        }
    } catch (error) {
        console.error(`[${timeStamp}] Error while validating hash:`, error);
        return "0";
    }
}
