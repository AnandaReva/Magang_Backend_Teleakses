import { Request, Response } from 'express';
import dotenv from 'dotenv';
import generateTimestamp from '../utils/generateTimeStamp';
import validateRequestHash from "../utils/validateRequestHash";
import checkBotOwnership from "../utils/checkBotOwnership";
dotenv.config();

export const getBotConversationHistoryTable = async (req: Request, res: Response) => {
    console.log("execute method: getBotConversationHistoryTable");
    console.log(`Request Body: ${JSON.stringify(req.body)}`);
    const realBackendURL = process.env.endpoint1 ?? '';
    const timeStamp = generateTimestamp();

    // Check if the URL is defined
    if (!realBackendURL) {
        res.status(500).json({ error_code: 'internal server error' });
        console.error(`[${timeStamp}] Response sent: res.status(500).json({ error_code: "Backend URL is not defined" }); Backend URL is not defined`);
        return;
    }

    // Validate request hash
    const validationResult = await validateRequestHash(req);

    if (validationResult === "0") {
        res.status(401).json({ error_code: 'unauthorized' });
        console.error(`[${timeStamp}] Hash not valid`);
        return;
    }

    
    const { botId, userId } = validationResult;

    console.log(`Bot ID received: ${botId}`);
    console.log(`User ID from session data: ${userId}`);

    // Check if the bot ownership is valid
    const isOwner = await checkBotOwnership(botId, userId);

    if (!isOwner) {
        res.status(403).json({ error_code: 'forbidden' });
        console.error(`[${timeStamp}] Response sent: res.status(403).json({ error_code: "forbidden", message: "Bot ID does not match owner ID" });`);
        return;
    }

    console.log('Hash is valid');
    console.log(`[${timeStamp}] Continuing request to real backend URL: ${realBackendURL}`);





    console.log(`Bot ID received: ${botId}`);
    console.log(`User ID from session data: ${userId}`);

    // Proceed if hash is valid
    console.log('---Hash is valid');
    console.log(`[${timeStamp}] continuing request to real backend URL: ${realBackendURL}`);

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

        const responseData = await backendResponse.json();
        const realBackendResStatus = backendResponse.status;

        res.status(realBackendResStatus).json(responseData);
        console.log(`Response real backend: res.status(${realBackendResStatus}).json(${JSON.stringify(responseData)});`);
    } catch (e) {
        console.error(`[${timeStamp}] Error forwarding request to backend: ${e}`);
        res.status(500).json({ error_code: 'internal server error' });
    }
};
