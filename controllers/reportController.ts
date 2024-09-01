import { Request, Response } from 'express';
import { PrismaClient } from "@prisma/client";
import generateTimestamp from '../utils/generateTimeStamp'
import createHMACSHA256Hash from "../utils/createHMACSHA256Hash";
const prisma = new PrismaClient();



const validateRequestHash = async (req: Request): Promise<boolean> => {
    const timeStamp = new Date().toISOString();
    console.log('Executing method: validateRequestHash');
    try {
        const sessionId = req.headers['ecwx-session-id'] as string || '';
        const hashReceived = req.headers['ecwx-hash'] as string || '';

        // Validate missing fields
        const missingFields: string[] = [];
        if (!sessionId) missingFields.push('session_id');
        if (!hashReceived) missingFields.push('hash');
        if (missingFields.length > 0) {
            console.error(`[${timeStamp}] Missing fields: ${missingFields.join(', ')}\nRequest sent: ${JSON.stringify(req.body)}`);
            return false;
        }

        console.log("Session ID Received:", sessionId);
        console.log("Hash Received:", hashReceived);

        const sessionData = await prisma.session.findUnique({ where: { session_id: sessionId } });
        if (!sessionData) {
            return false;
        }

        const sessionSecret = sessionData['session_secret'];
        const postBody = req.body;

        const postBodyString = JSON.stringify(postBody);
        console.log("Post Body String:", postBodyString);


        const hashExpected = createHMACSHA256Hash(postBodyString, sessionSecret.toString());

        console.log(`Expected Hash: [${hashExpected}]`);
        console.log(`Received Hash from header: [${hashReceived}]`);

        if (hashReceived === hashExpected) {
            return true;
        } else {
            return false;
        }
    } catch (error) {
        console.error(`[${timeStamp}] Error while validating hash:`, error);
        return false;
    }
};




export const getBotConversationHistoryTable = async (req: Request, res: Response) => {
    const timeStamp = generateTimestamp();
    const isHashValid = await validateRequestHash(req);
    if (!isHashValid) {
        res.status(401).json({
            error: `Hash not Valid`
        });
        console.error(`[${timeStamp}] Hash not Valid`)
        return;
    }
    //if hash valid 

    console.log('Hash is Valid');
    try {
        const backendUrl = "https://chaewon.cayangqu.com/backoffice-helper-api/get_bot_conversation_history_table";

        // Send to real backend
        const backendResponse = await fetch(backendUrl, {
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
        res.status(realbackendResStatus).json(JSON.stringify(responseData));
        console.log(`Response real backend: res.status(${realbackendResStatus}).json(${JSON.stringify(responseData)});`,);
        console.log(`Response sent res.status(${realbackendResStatus}).json(${JSON.stringify(responseData)});`,);

    } catch (e) {
        console.error(`[${timeStamp}] Error forwarding request to backend:' ${e}`);
        res.status(500).json({ error: 'Failed to communicate with backend' });
    }
}


export const getBotExecutiveSummary = async (req: Request, res: Response) => {
    const timeStamp = generateTimestamp();
    const isHashValid = await validateRequestHash(req);
    if (!isHashValid) {
        res.status(401).json({ error: 'Hash not Valid' });
        console.error(`[${timeStamp}] Hash not Valid`);
        return;
    }
    console.log('Hash is Valid');
    try {
        const backendUrl = "https://chaewon.cayangqu.com/backoffice-helper-api/get_bot_executive_summary";
        const backendResponse = await fetch(backendUrl, {
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
        res.status(realbackendResStatus).json(JSON.stringify(responseData));
        console.log(`Response real backend: res.status(${realbackendResStatus}).json(${JSON.stringify(responseData)});`,);
        console.log(`Response sent res.status(${realbackendResStatus}).json(${JSON.stringify(responseData)});`,);
    } catch (e) {
        console.error(`[${timeStamp}] Error forwarding request to backend: ${e}`);
        res.status(500).json({ error: 'Failed to communicate with backend' });
    }
}

export const getBotConversationTopicChart = async (req: Request, res: Response) => {
    const timeStamp = generateTimestamp();
    const isHashValid = await validateRequestHash(req);
    if (!isHashValid) {
        res.status(401).json({ error: 'Hash not Valid' });
        console.error(`[${timeStamp}] Hash not Valid`);
        return;
    }
    console.log('Hash is Valid');
    try {
        const backendUrl = "https://chaewon.cayangqu.com/backoffice-helper-api/get_bot_conversation_topic_chart";
        const backendResponse = await fetch(backendUrl, {
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
        res.status(realbackendResStatus).json(JSON.stringify(responseData));
        console.log(`Response real backend: res.status(${realbackendResStatus}).json(${JSON.stringify(responseData)});`,);
        console.log(`Response sent res.status(${realbackendResStatus}).json(${JSON.stringify(responseData)});`,);
    } catch (e) {
        console.error(`[${timeStamp}] Error forwarding request to backend: ${e}`);
        res.status(500).json({ error: 'Failed to communicate with backend' });
    }
}



