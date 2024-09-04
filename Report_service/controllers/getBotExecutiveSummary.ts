import { Request, Response } from 'express';
import dotenv from 'dotenv'
import generateTimestamp from '../utils/generateTimeStamp'
import validateRequestHash from "../utils/validateRequestHash";
import checkBotOwnership from "../utils/checkBotOwnership";
dotenv.config();



export const getBotExecutiveSummary = async (req: Request, res: Response) => {
    console.log("execute method: getBotExecutiveSummary");
    console.log(`Request Body: ${JSON.stringify(req.body)}`)
    const realBackendURL = process.env.endpoint2 ?? "";
    console.log(`Real Backend URL: ${realBackendURL}`);
    const timeStamp = generateTimestamp();
    if (!realBackendURL) {
        res.status(500).json({ error: 'internal server error' });
        console.error(`[${timeStamp}] Response sent: res.status(500).json({ error: "Backend URL is not defined" }); Backend URL is not defined`);
        return;
    }




    // Validate request hash
    const validationResult = await validateRequestHash(req);

    if (validationResult === "0") {
        res.status(401).json({ error_code: 'unauthorized' });
        console.error(`[${timeStamp}] Hash not valid`);
        return;
    }

    // Extract botId and userId from validationResult
    const { botId, sessionData } = validationResult;
    const { userId } = sessionData;

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
    console.log(`[${timeStamp} continuing request to real backend url: ${realBackendURL}]`);
    try {
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
        const realbackendResStatus = backendResponse.status;
        res.status(realbackendResStatus).json(responseData);
        console.log(`Response real backend: res.status(${realbackendResStatus}).json(${JSON.stringify(responseData)});`,);
        console.log(`Response sent res.status(${realbackendResStatus}).json(${JSON.stringify(responseData)});`,);
    } catch (e) {
        console.error(`[${timeStamp}] Error forwarding request to backend: ${e}`);
        res.status(500).json({ error_code: 'Failed to communicate with backend' });
    }

}