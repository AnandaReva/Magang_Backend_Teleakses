import { Request, Response } from 'express';
import dotenv from 'dotenv';
import validateRequestHash from "../utils/validateRequestHash";
import checkBotOrganization from "../utils/checkBotOrganization";
import log from '../utils/logHelper';
import { globalVar } from '../utils/globalVar';
import pool from '../db/config';
dotenv.config();


async function getOutboundUrlFromMainPrompt(botId: string): Promise<string | null> {
    let referenceId = globalVar.getReferenceId() || 'undefined';
    log(referenceId, '\nExecuting method: getOutboundUrlFromMainPrompt');
    log(referenceId, "Bot id Received:", botId);


    const bot_id = 7;

    const OutboundUrlQuery = "SELECT data FROM servobot2.main_prompt WHERE id = $1";
    log(referenceId, "Query to find data in main_prompt", OutboundUrlQuery);

    const client = await pool.connect();

    try {
        const result = await client.query(OutboundUrlQuery, [bot_id]);

        if (result.rowCount === 0) {
            log(referenceId, `No data found for bot_id = [${botId}]`);
            return null;
        }
        // Access the 'data' field from the first row
        const resultData = result.rows[0];

        log(referenceId, `data field = [${JSON.stringify(resultData)}]`);
        //const outbound_url = data.outbound_url;
        const outbound_url = resultData.data.outbound_url;

        if (!outbound_url) {
            log(referenceId, `Outbound URL not found for bot_id = [${botId}]`);
            return null;
        }
        log(referenceId, "Outbound URL retrieved:", outbound_url);

        return outbound_url;

    } catch (error) {
        log(referenceId, `Error while querying main_prompt = [${botId}]:`, error);
        return null;
    } finally {
        client.release();
    }
}


export const coba = async (req: Request, res: Response) => {
    let referenceId = globalVar.getReferenceId() || 'undefined';

    log(referenceId, "Executing method: coba");

    /*  const realBackendURL = process.env.endpoint10 ?? '';
 
     if (!realBackendURL) {
         res.status(500).json({
             error_code: "5000011",
             error_message: "internal server error",
         });
         log(referenceId, `Response sent: res.status(500).json({ error_code: "internal server error", message: "Real Backend URL is not defined" });`);
         return;
     } */

    const botId = req.body?.bot_id;
    const sessionId = req.headers['ecwx-session-id'] as string;
    const hash = req.headers['ecwx-hash'] as string;

    if (!botId) {
        res.status(400).json({
            error_message: "invalid request",
            error_code: "40000051",
        });
        log(referenceId, "Bot ID not found in request body");
        return;
    }

    //Prepare post body from FE
    const postBodyFromFe = req.body;
    // Validate request hash
    const validationResult = await validateRequestHash(botId, sessionId, hash, postBodyFromFe);

    // Check if validation failed
    if (!validationResult) {

        res.status(401).json({
            error_message: "unauthenticated",
            error_code: "40000052"
        });
        log(referenceId, "Hash validation failed");
        
        return;
    }

    const { userId, organizationId } = validationResult;
    log(referenceId, `Bot ID received: ${botId}`);
    log(referenceId, `User ID from session data: ${userId}`);
    log(referenceId, `Organization ID from session data: ${organizationId}`);


    // Check if the bot organization is valid
    const isOrganization = await checkBotOrganization(botId, userId, organizationId);
    if (!isOrganization) {
        res.status(403).json({
            error_code: "4030101",
            error_message: "forbidden",
        });
        log(referenceId, `Response sent: res.status(403).json({ error_code: "forbidden", message: "Bot ID does not match organization Id" });`);
        return;
    }

    log(referenceId, 'Hash is valid');

    const outbound_url = await getOutboundUrlFromMainPrompt(botId);
    if (!outbound_url) {
        res.status(404).json({
            error_code: "4040101",
            error_message: "",
        });
        log(referenceId, `Response sent: res.status(404).json({ error_code: "", message: "outbound_url not found in data main_prompt" });`);
        return;
    }


    res.status(200).json({
        outbound_url,
        organizationId,
    });
    log(referenceId, " res.status(200) : Response sent:", {
        outbound_url,
        organizationId,
    });




    /*    log(referenceId, `Continuing request to real backend URL: ${realBackendURL}`);
   
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
               error_code: "5000101",
               error_message: "internal server error",
           });
   
           log(referenceId, "Response sent: res.status(500).json({ error_code: '5000101', error_message: 'internal server error' });", `Error forwarding request to backend: ${e}`);
   
       } */
};
