import { Request, Response } from 'express';
import { createHMACSHA256HashBase64 } from "../utils/createHMACSHA256Hash";
import dotenv from 'dotenv';
import pool from '../db/config';
import log from '../utils/logHelper';
import { globalVar } from '../utils/globalVar';

dotenv.config();


const getSessionSecret = async (sessionId: string): Promise<string> => {
    let referenceId = globalVar.getReferenceId() || 'undefined';
    try {
        const client = await pool.connect();
        try {
            const sessionQuery = 'SELECT session_secret FROM servouser.session WHERE session_id = $1 LIMIT 1';
            log(referenceId, `Query to find session secret: ${sessionQuery}`);
            const result = await client.query(sessionQuery, [sessionId]);

            if (result.rowCount === 0) {
                log(referenceId, `Session data with session id = [${sessionId}] not found in database`);
                return "0";
            }
            return result.rows[0].session_secret;
        } finally {
            client.release();
        }
    } catch (error) {
        log(referenceId, `Error retrieving session secret: ${error}`);
        throw new Error('Internal server error while retrieving session secret');
    }
};

export const getBotConversation = async (req: Request, res: Response) => {
    let referenceId = globalVar.getReferenceId() || 'undefined';

    log(referenceId, "Executing method: getBotConversation");
    const realBackendURL = process.env.endpoint4 ?? "";

    if (!realBackendURL) {
        res.status(500).json({
            error_code: "5000002",
            error_message: "internal server error",
        });
        log(referenceId, `referenceId Real Backend URL is not defined`);
        return;
    }

    const sessionId = req.headers['ecwx-session-id'] as string || '';
    const job_id = JSON.stringify(req.body);

    log(referenceId, "Session ID received:", sessionId);
    log(referenceId, "Job ID received:", job_id);

    if (!sessionId) {
        res.status(400).json({
            error_message: "invalid request. invalid field value",
            error_code: "40000004",
        });
        log(referenceId, `Session ID not provided`);
        return;
    }
    if (!job_id) {
        res.status(400).json({
            error_message: "invalid request. invalid field value",
            error_code: "40000004",
        });
        log(referenceId, `Job ID not provided`);
        return;
    }
    const sessionSecret = await getSessionSecret(sessionId);

    if (sessionSecret === '0') {
        res.status(401).json({
            error_message: "unauthenticated",
            error_code: "40100041"
        });
        log(referenceId, `Session secret not found for session ID [${sessionId}]`);
        return;
    }
    const expectedHash = createHMACSHA256HashBase64(job_id, sessionSecret);
    log(referenceId, "Job ID:", job_id);
    log(referenceId, 'Session Secret:', sessionSecret);
    const receivedHash = req.headers['ecwx-hash'] as string || '';

    log(referenceId, `Expected Hash: [${expectedHash}]`);
    log(referenceId, `Received Hash: [${receivedHash}]`);

    if (expectedHash !== receivedHash) {
        res.status(401).json({
            error_message: "unauthenticated",
            error_code: "40100041"
        });
        log(referenceId, `Hash validation failed. Expected: [${expectedHash}], Received: [${receivedHash}]`);
        return;
    }
    log(referenceId, 'Hash is valid');
    log(referenceId, ` Forwarding request to backend: ${realBackendURL}`);

    try {
        // Send request to the real backend
        const backendResponse = await fetch(realBackendURL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ecwx-session-id': req.headers['ecwx-session-id'] as string,
                'ecwx-hash': req.headers['ecwx-hash'] as string,
            },
            body: JSON.stringify(req.body),
        });

        log(referenceId, `Post body sent to real backend: ${JSON.stringify(req.body)}`);
        const responseData = await backendResponse.json();
        const realBackendResStatus = backendResponse.status;
        res.status(realBackendResStatus).json(responseData);
        log(referenceId, `Response from real backend: res.status(${realBackendResStatus}).json(${JSON.stringify(responseData)});`);
        log(referenceId, "Send Real Backend response to FE", `status: ${realBackendResStatus} Response Data:, ${JSON.stringify(responseData)}`);

    } catch (e) {
        res.status(500).json({
            error_code: "5000041",
            error_message: "internal server error",
        });
        log(referenceId, ` Error forwarding request to backend: ${e}`);
    }
};
