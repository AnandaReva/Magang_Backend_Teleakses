import { Request, Response } from 'express';
import createHMACSHA256Hash from "../utils/createHMACSHA256Hash";
import dotenv from 'dotenv';
import generateTimestamp from '../utils/generateTimeStamp';
import pool from '../db/config';

dotenv.config();


const getSessionSecret = async (sessionId: string): Promise<string> => {
    try {
        const client = await pool.connect();
        try {
            const sessionQuery = 'SELECT session_secret FROM servouser.session WHERE session_id = $1 LIMIT 1';
            console.log(`Query to find session secret: ${sessionQuery}`);
            const result = await client.query(sessionQuery, [sessionId]);

            if (result.rowCount === 0) {
                console.error(`Session data with session id = [${sessionId}] not found in database`);
                return "0";
            }

            return result.rows[0].session_secret;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error(`Error retrieving session secret: ${error}`);
        throw new Error('Internal server error while retrieving session secret');
    }
};

export const getBotConversation = async (req: Request, res: Response) => {
    console.log("Executing method: getBotConversation");

    const realBackendURL = process.env.endpoint4 ?? "";
    const timeStamp = generateTimestamp();

    if (!realBackendURL) {
        res.status(500).json({ error: 'Internal server error' });
        console.error(`[${timeStamp}] Backend URL is not defined`);
        return;
    }

    const sessionId = req.headers['ecwx-session-id'] as string || '';
    const job_id = JSON.stringify(req.body);

    console.log("Session ID received:", sessionId);

    console.log("Job ID received:", job_id);

    if (!sessionId) {
        res.status(400).json({ error: 'Missing session ID' });
        console.error(`[${timeStamp}] Session ID not provided`);
        return;
    }
    if (!job_id) {
        res.status(400).json({
            error_message: "invalid request. invalid field value",
            error_code: "40000004",
        });
        console.error(`[${timeStamp}] Job ID not provided`);
        return;
    }
    const sessionSecret = await getSessionSecret(sessionId);

    if (sessionSecret === '0') {
        res.status(401).json({
            error_message: "unauthenticated",
            error_code: "40100001"
        });
        console.error(`[${timeStamp}] Session secret not found for session ID [${sessionId}]`);
        return;
    }
    const expectedHash = createHMACSHA256Hash(job_id, sessionSecret);
    console.log("Job ID:", job_id, 'Session Secret:', sessionSecret);
    const receivedHash = req.headers['ecwx-hash'] as string || '';

    console.log(`Expected Hash: [${expectedHash}]`);
    console.log(`Received Hash: [${receivedHash}]`);

    if (expectedHash !== receivedHash) {
        res.status(401).json({
            error_message: "unauthenticated",
            error_code: "40100001"
        });
        console.error(`[${timeStamp}] Hash validation failed. Expected: [${expectedHash}], Received: [${receivedHash}]`);
        return;
    }
    console.log('Hash is valid');
    console.log(`[${timeStamp}] Forwarding request to backend: ${realBackendURL}`);

    try {
        const backendResponse = await fetch(realBackendURL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ecwx-session-id': sessionId,
                'ecwx-hash': receivedHash,
            },
            body: JSON.stringify(req.body),
        });
        const responseData = await backendResponse.json();
        const realBackendResStatus = backendResponse.status;

        res.status(realBackendResStatus).json(responseData);
        console.log(`Response from backend: res.status(${realBackendResStatus}).json(${JSON.stringify(responseData)})`);
    } catch (e) {
        console.error(`[${timeStamp}] Error forwarding request to backend: ${e}`);
        res.status(500).json({ error_code: 'Failed to communicate with backend' });
    }
};
