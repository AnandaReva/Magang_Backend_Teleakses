import { Request, Response } from 'express';
import { PrismaClient } from "@prisma/client";
import generateTimestamp from '../utils/generateTimeStamp'
import createHMACSHA256Hash from "../utils/createHMACSHA256Hash";
import { GlobalVar } from '../utils/globalvar';
const prisma = new PrismaClient();



/* hash adalah HMAC-SHA256(message=body request post-nya, key= session secret) */
const validateRequestHash = async (req: Request): Promise<boolean> => {
    const timeStamp = generateTimestamp();
    console.log('execute method validateRequestHash')
    try {
        const postBody = JSON.stringify(req.body);
        const sessionSecret = GlobalVar.getSessionSecret();

        console.log("Post Body:", postBody);
        console.log("Session Secret:", sessionSecret);
        console.log("Headers:", JSON.stringify(req.headers));

        // Create hash
        const hashExpected = createHMACSHA256Hash(postBody, sessionSecret);

        // Get hash from header
        const hashReceived = req.headers['ecwx-hash'] as string || '';

        console.log('--------------------------------');
        console.log(`Expected Hash: [${hashExpected}]`);
        console.log(`Received Hash from header: [${hashReceived}]`);

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
            error: `Hash Received Not Valid`
        });
        console.error(`[${timeStamp}] Hash Received Not Valid`)
        return;
    }
    //if hash valid 

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

        res.status(backendResponse.status).json(responseData);

    } catch (e) {
        console.error(`[${timeStamp}] Error forwarding request to backend:' ${e}`);
        res.status(500).json({ error: 'Failed to communicate with backend' });
    }
}


export const getBotExecutiveSummary = async (req: Request, res: Response) => {

    // validate req hash


    const responseData = {
        message: "Data from get_bot_conversation_history_table",
        data: req.body,
    };

    return res.json(responseData);



}

export const getBotConversationTopicChart = async (req: Request, res: Response) => {

    // validate req hash


    const responseData = {
        message: "Data from get_bot_conversation_history_table",
        data: req.body,
    };

    return res.json(responseData);



}









