import pool from '../db/config';
import {createHMACSHA256HashBase64} from "./createHMACSHA256Hash";
import generateTimestamp from './generateTimeStamp';
import { Request } from "express";

export default async function validateRequestHash(req: Request, bot_id: string, session_id: string, hash: string): Promise<{ botId: string, organizationId: string, userId: string } | "0"> {
    const timeStamp = generateTimestamp();
    console.log('Executing method: validateRequestHash');

    console.log("Session ID Received:", session_id);
    console.log("Hash Received:", hash);

    // Validate fields
    const missingFields: string[] = [];
    if (!session_id) missingFields.push('session_id');
    if (!hash) missingFields.push('hash');
    if (missingFields.length > 0) {
        console.error(`[${timeStamp}] Missing fields: ${missingFields.join(', ')}\nRequest sent: ${JSON.stringify(req.body)}`);
        return "0";
    }

    const sessionQuery = 'SELECT a.session_secret, a.user_id, b.organization_id FROM servouser.session a LEFT JOIN servouser.user b ON b.id = a.user_id WHERE a.session_id = $1 LIMIT 1';
    console.log(`Query to find session data and organization id: ${sessionQuery}`);
    try {

        const result = await pool.query(sessionQuery, [session_id]);
        if (result.rowCount === 0) {
            console.error(`[${timeStamp}] Session data with id = [${session_id}] not found in database`);
            return "0";
        }
        console.log("Result from session and organization query:", result.rowCount);

        const sessionSecret = result.rows[0].session_secret;
        const userId = result.rows[0].user_id;
        const organizationId = result.rows[0].organization_id;

        console.log(`sessionSecret: ${sessionSecret}`);
        console.log(`userId: ${userId}`);
        console.log(`organizationId: ${organizationId}`);
        console.log(`Post Body: ${JSON.stringify(req.body)}`);


        const postBodyString = JSON.stringify(req.body);
        const hashExpected = createHMACSHA256HashBase64(postBodyString, sessionSecret.toString());

        console.log("Session Secret from DB:", sessionSecret);
        console.log("Post Body from FE (stringify):", postBodyString);
        console.log(`Expected Hash: [${hashExpected}]`);
        console.log(`Received Hash from header: [${hash}]`);

        // validate hash
        if (hash !== hashExpected) {
            console.error(`[${timeStamp}] Hash validation failed. Expected: [${hashExpected}],\n Received: [${hash}]`);
            return "0";
        }

        console.log(`Bot ID from request body: ${bot_id}`);
        console.log(`User ID from DB: ${userId}`);
        console.log(`User ID received: ${userId}`);

        //retrun data
        return {
            botId: bot_id,
            organizationId: organizationId.toString(),
            userId: userId.toString()
        };
    } catch (error) {
        console.error(`[${timeStamp}] Error while validating hash:`, error);
        return "0";
    }
}