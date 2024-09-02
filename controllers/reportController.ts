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
        console.log("Session ID Received:", sessionId);
        console.log("Hash Received:", hashReceived);
        // Validate 
        const missingFields: string[] = [];
        if (!sessionId) missingFields.push('session_id');
        if (!hashReceived) missingFields.push('hash');
        if (missingFields.length > 0) {
            console.error(`[${timeStamp}] Missing fields: ${missingFields.join(', ')}\nRequest sent: ${JSON.stringify(req.body)}`);
            return false;
        }

        const sessionData = await prisma.session.findUnique({ where: { session_id: sessionId } });
        if (!sessionData) {
            console.error(`Session data with id = [ ${sessionId} ] not found in database \n`)
            return false;
        }

        const sessionSecret = sessionData['session_secret'];
        const postBody = req.body;

        const postBodyString = JSON.stringify(postBody);
        const hashExpected = createHMACSHA256Hash(postBodyString, sessionSecret.toString());
        console.log("Session Secret from DB:", sessionSecret);
        console.log("Post Body String:", postBodyString);
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
    const backendUrl = "https://chaewon.cayangqu.com/backoffice-helper-api/get_bot_conversation_history_table";
    const timeStamp = generateTimestamp();
    const isHashValid = await validateRequestHash(req);
    if (!isHashValid) {
        res.status(401).json({
            error: `Hash not Valid`
        });
        console.error(`[${timeStamp}]response sent :  res.status(401).json({error: "Hash not Valid"}); Hash not Valid`);
        return;
    }
    //if hash valid 
    console.log('Hash is Valid');
    console.log(`[${timeStamp} continuing request to real backend url: ${backendUrl}]`);
    try {

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
        res.status(realbackendResStatus).json(responseData);
        console.log(`Response real backend: res.status(${realbackendResStatus}).json(${JSON.stringify(responseData)});`,);
        console.log(`Response sent res.status(${realbackendResStatus}).json(${JSON.stringify(responseData)});`,);

    } catch (e) {
        console.error(`[${timeStamp}] Error forwarding request to backend:' ${e}`);
        res.status(500).json({ error: 'Failed to communicate with backend' });
    }
}


export const getBotExecutiveSummary = async (req: Request, res: Response) => {
    const backendUrl = "https://chaewon.cayangqu.com/backoffice-helper-api/get_bot_executive_summary";
    const timeStamp = generateTimestamp();
    const isHashValid = await validateRequestHash(req);
    if (!isHashValid) {
        res.status(401).json({ error: 'Hash not Valid' });
        console.error(`[${timeStamp}]response sent :  res.status(401).json({error: "Hash not Valid"}); Hash not Valid`);
        return;
    }
    console.log('Hash is Valid');
    console.log(`[${timeStamp} continuing request to real backend url: ${backendUrl}]`);
    try {
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
        res.status(realbackendResStatus).json(responseData);
        console.log(`Response real backend: res.status(${realbackendResStatus}).json(${JSON.stringify(responseData)});`,);
        console.log(`Response sent res.status(${realbackendResStatus}).json(${JSON.stringify(responseData)});`,);
    } catch (e) {
        console.error(`[${timeStamp}] Error forwarding request to backend: ${e}`);
        res.status(500).json({ error: 'Failed to communicate with backend' });
    }
}

export const getBotConversationTopicChart = async (req: Request, res: Response) => {

    const backendUrl = "https://chaewon.cayangqu.com/backoffice-helper-api/get_bot_conversation_topic_chart";
    const timeStamp = generateTimestamp();
    const isHashValid = await validateRequestHash(req);
    if (!isHashValid) {
        res.status(401).json({ error: 'Hash not Valid' });
        console.error(`[${timeStamp}]response sent :  res.status(401).json({error: "Hash not Valid"}); Hash not Valid`);
        return;
    }
    console.log('Hash is Valid');
    console.log(`[${timeStamp} continuing request to real backend url: ${backendUrl}]`);
    try {
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
        res.status(realbackendResStatus).json(responseData);
        console.log(`Response real backend: res.status(${realbackendResStatus}).json(${JSON.stringify(responseData)});`,);
        console.log(`Response sent res.status(${realbackendResStatus}).json(${JSON.stringify(responseData)});`,);
    } catch (e) {
        console.error(`[${timeStamp}] Error forwarding request to backend: ${e}`);
        res.status(500).json({ error: 'Failed to communicate with backend' });
    }
}



