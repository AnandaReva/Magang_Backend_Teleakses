import { Request, Response } from 'express';
import dotenv from 'dotenv'
import generateTimestamp from '../utils/generateTimeStamp'
import validateRequestHash from "../utils/validateRequestHash";

dotenv.config();


export const getBotConversationTopicChart = async (req: Request, res: Response) => {
    console.log("execute method: getBotConversationTopicChart");
    console.log(`Request Body: ${JSON.stringify(req.body)}`)
    const timeStamp = generateTimestamp();
    const realBackendURL = process.env.endpoint3 ?? "";
    console.log(`Real backend URL: ${realBackendURL}`);
    // Check if the URL is defined 
    if (!realBackendURL) {
        res.status(500).json({ error_code: 'Internal server error_code' });
        console.error(`[${timeStamp}] Response sent: res.status(500).json({ error_code: "Backend URL is not defined" }); Backend URL is not defined`);
        return;
    }
    const isHashValid = await validateRequestHash(req);
    if (!isHashValid) {
        res.status(401).json({ error_code: 'Unauthorize' });
        console.error(`[${timeStamp}]response sent :  res.status(401).json({error_code: "Hash not valid"}); Hash not valid`);
        return;
    }
    console.log('Hash is valid');
    console.log(`[${timeStamp}] continuing request to real backend url: [${realBackendURL}]`);
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
        res.status(500).json({ error_code: 'internal server error_code' });
    }
}




