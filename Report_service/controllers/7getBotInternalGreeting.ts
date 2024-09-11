import { Request, Response } from 'express';
import dotenv from 'dotenv';
import generateTimestamp from '../utils/generateTimeStamp';
import validateRequestHash from "../utils/validateRequestHash";
import checkBotOrganization from "../utils/checkBotOrganization";
dotenv.config();

export const getBotInternalGreeting = async (req: Request, res: Response) => {
    console.log("Executing method: getBotInternalGreeting");

    const realBackendURL = process.env.endpoint7 ?? '';
    const timeStamp = generateTimestamp();

    if (!realBackendURL) {
        res.status(500).json({
            error_code: "5000071",
            error_message: "error, internal server error",
        });
        console.error(`[${timeStamp}] Response sent: res.status(500).json({ error_code: "internal server error", message: "Backend URL is not defined" });`);
        return;
    }

    const botId = req.body?.bot_id;
    const sessionId = req.headers['ecwx-session-id'] as string;
    const hash = req.headers['ecwx-hash'] as string;

    if (!botId) {
        res.status(400).json({
            error_message: "invalid request. invalid field value",
            error_code: "40000071",
        });
        console.error(`[${timeStamp}] Bot ID not found in request body`);
        return;
    }

    // Validate request hash
    const validationResult = await validateRequestHash(req, botId, sessionId, hash);

    // Check if validation failed
    if (validationResult === "0") {
        res.status(401).json({
            error_message: "unauthenticated",
            error_code: "40100072"
        });
        console.error(`[${timeStamp}] Hash validation failed`);
        return;
    }

    const { userId, organizationId } = validationResult;
    console.log(`Bot ID received: ${botId}`);
    console.log(`User ID from session data: ${userId}`);
    console.log(`Organization ID from session data: ${organizationId}`);

    // Check if the bot organization is valid
    const isOrganization = await checkBotOrganization(botId, userId, organizationId);
    if (!isOrganization) {
        res.status(403).json({
            error_code: "4030071",
            error_message: "forbidden",
        });
        console.error(`[${timeStamp}] Response sent: res.status(403).json({ error_code: "forbidden", message: "Bot ID does not match organization ID" });`);
        return;
    }

    console.log('Hash is valid');
    console.log(`[${timeStamp}] Continuing request to real backend URL: ${realBackendURL}`);

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

        console.log(`Post body sent to real backend: ${JSON.stringify(req.body)}`);

        const responseData = await backendResponse.json();
        const realBackendResStatus = backendResponse.status;

        res.status(realBackendResStatus).json(responseData);
        console.log(`Response from real backend: res.status(${realBackendResStatus}).json(${JSON.stringify(responseData)});`);
        console.log("Send Real Backand Status to FE", realBackendResStatus, "Response Data", responseData);
    } catch (e) {
        console.error(`[${timeStamp}] Error forwarding request to backend: ${e}`);
        res.status(500).json({
            error_code: "5000071",
            error_message: "error, internal server error",
        });
    }
};
