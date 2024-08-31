import { Request, Response } from 'express';
import { PrismaClient } from "@prisma/client";
import generateTimestamp from '../utils/generateTimeStamp'
//import createHMACSHA256Hash from "../utils/createHMACSHA256Hash";
const prisma = new PrismaClient();


import { createHmac } from "crypto";

// Function to create HMAC SHA256 hash with data as a JSON string
export default function createHMACSHA256Hash(data: string, key: string): string {
    console.log("Executing method: createHMACSHA256Hash");
    console.log(`[ Data: ${data}]`);
    console.log(`[ Key: ${key}]`);

    // Create the HMAC hash using sha256 and output as base64
    const hmacSHA256Hash = createHmac('sha256', key)
        .update(data)
        .digest('base64');

    console.log("[HMAC SHA256 result: ", hmacSHA256Hash, "] \n ----------------");
    return hmacSHA256Hash;
}

/* Hash validation function */
const validateRequestHash = async (req: Request): Promise<boolean> => {
    const timeStamp = generateTimestamp();
    console.log('execute method validateRequestHash');
    try {
        // Get session-id and hash from headers
        const sessionId = req.headers['ecwx-session-id'] as string || '';
        const hashReceived = req.headers['ecwx-hash'] as string || '';

        // Validate missing fields
        const missingFields: string[] = [];
        if (!sessionId) missingFields.push('session_id');
        if (!hashReceived) missingFields.push('hash');
        if (missingFields.length > 0) {
            console.log("Check missing fields:");
            console.error(`[${timeStamp}] Missing fields: ${missingFields.join(', ')}\nRequest sent: ${JSON.stringify(req.body)}`);
            return false;
        }
        console.log("session id Received: ", sessionId);
        console.log("hash Received: ", hashReceived);

        // Fetch session data
        const sessionData = await prisma.session.findUnique({
            where: { session_id: sessionId }
        });
        if (!sessionData) {
            return false;
        }

        const sessionSecret = sessionData['session_secret'];

        // Get post body
        const postBody = req.body;

        // Function to sort object keys and ensure empty objects are maintained
        const serializeWithSortedKeys = (obj: any): string => {
            const sortKeys = (input: any): any => {
                if (Array.isArray(input)) {
                    return input.map(sortKeys);
                } else if (input !== null && typeof input === 'object') {
                    return Object.keys(input)
                        .sort()
                        .reduce((acc, key) => {
                            acc[key] = sortKeys(input[key]);
                            return acc;
                        }, {} as any);
                }
                return input;
            };

            const sortedObj = sortKeys(obj);
            return JSON.stringify(sortedObj, (key, value) => (value === undefined ? null : value));
        };

        // Serialize the post body with sorted keys
        const sortedPostBodyString = serializeWithSortedKeys(postBody);

        console.log("Sorted Post Body String:", sortedPostBodyString);

        // Create hash using the sorted string and session secret
        const hashExpected = createHMACSHA256Hash(sortedPostBodyString, sessionSecret.toString());

        console.log("Post Body:", sortedPostBodyString);
        console.log("Session Secret:", sessionSecret);
        console.log('--------------------------------');
        console.log(`Expected Hash: [${hashExpected}]`);
        console.log(`Received Hash from header: [${hashReceived}]`);

        // Validate the received hash against the expected hash
        if (hashReceived) {
            return hashReceived === hashExpected;
        } else {
            console.warn('Hash not found in request headers');
            return false;
        }
    } catch (error) {
        console.error(`[${timeStamp}] Error While validating hash:`, error);
        return false;
    }
};




/*
Endpoint 1: /get_bot_conversation_history_table

URL: https://chaewon.cayangqu.com/backoffice-helper-api/get_bot_conversation_history_table
Request Parameter:

{
  "data": {
    "row_length": Number(rowLength.value),
    "page": currentPage.value,
    "sort_column": 0,
    "direction": "desc",
    "bot_id": queryID.value
  },
  "from_date": Number(dateOfCustom.value.fromDate),
  "to_date": Number(dateOfCustom.value.toDate),
  "search_filter": tempFilter.value.topic,
  "date_mode": Number(tempFilter.value.date)
} */


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
        res.status(realbackendResStatus).json(responseData);
        console.log(`Response real backend: res.status(${realbackendResStatus}).json(${JSON.stringify(responseData)});`,);


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
        res.status(realbackendResStatus).json(responseData);
        console.log(`Response real backend: res.status(${realbackendResStatus}).json(${responseData});`);
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
        res.status(realbackendResStatus).json(responseData);
        console.log(`Response real backend: res.status(${realbackendResStatus}).json(${responseData});`);
    } catch (e) {
        console.error(`[${timeStamp}] Error forwarding request to backend: ${e}`);
        res.status(500).json({ error: 'Failed to communicate with backend' });
    }
}



