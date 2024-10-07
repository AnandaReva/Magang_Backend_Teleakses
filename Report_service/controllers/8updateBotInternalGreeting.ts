import { Request, Response } from 'express';
import dotenv from 'dotenv';
import validateRequestHash from "../utils/validateRequestHash";
import checkBotOrganization from "../utils/checkBotOrganization";
import log from '../utils/logHelper';
import { globalVar } from '../utils/globalVar';

dotenv.config();

export const updateBotInternalGreeting = async (req: Request, res: Response) => {
    let referenceId = globalVar.getReferenceId() || 'undefined';

    log(referenceId, "Executing method: updateBotInternalGreeting");

    const realBackendURL = process.env.endpoint8 ?? '';

    if (!realBackendURL) {
        res.status(500).json({
            error_code: "5000001",
            error_message: "internal server error",
        });
        log(referenceId, "Real Backend URL is not defined");
        log(referenceId, ` Response sent: res.status(500).json({ error_code: "5000001", message: "internal server error" });`);
        return;
    }

    const botId = req.body?.bot_id;
    const sessionId = req.headers['ecwx-session-id'] as string;
    const hash = req.headers['ecwx-hash'] as string;

    if (!botId) {
        res.status(400).json({
            error_message: "invalid request",
            error_code: "40000001",
        });
        log(referenceId, "Bot ID not found in request body");
        log(referenceId, `Response sent: res.status(400).json({ error_code: "40000001", message: "invalid request" });`);
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
            error_code: "40100001"
        });
        log(referenceId, "Hash validation failed");
        log(referenceId, `Response sent: res.status(401).json({ error_code: "40100002", message: "unauthenticated" });`);
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
            error_code: "4030001",
            error_message: "forbidden",
        });
        log(referenceId, "Bot ID does not match organization ID");
        log(referenceId, `Response sent: res.status(403).json({ error_code: "4030001", message: "forbidden" });`);
        return;
    }
    log(referenceId, 'Hash is valid');
    log(referenceId, `Continuing request to real backend URL: ${realBackendURL}`);

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
    }catch (e) {
        res.status(500).json({
            error_code: "5000002",
            error_message: "internal server error",
        });
        log(referenceId, `Error forwarding request to backend: ${e}`);
        log(referenceId, `Response sent: res.status(500).json({ error_code: "5000002", message: "internal server error" });`);
    }
};
