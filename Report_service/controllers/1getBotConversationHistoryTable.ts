import { Request, Response } from 'express';
import dotenv from 'dotenv';
import validateRequestHash from "../utils/validateRequestHash";
import checkBotOrganization from "../utils/checkBotOrganization";
import log from '../utils/logHelper';
import { globalVar } from '../utils/globalVar';

dotenv.config();

export const getBotConversationHistoryTable = async (req: Request, res: Response) => {
    let referenceId = globalVar.getReferenceId() || 'undefined';

    log(referenceId, "Executing method: getBotConversationHistoryTable");
    const realBackendURL = process.env.endpoint1 ?? '';
    // Check if the URL is defined
    if (!realBackendURL) {
        res.status(500).json({
            error_code: "5000011",
            error_message: "internal server error",
        });
        log(referenceId, ` Response sent: res.status(500).json({ error_code: "internal server error", message: "Real Backend URL is not defined" });`);
        return;
    }


    const postBody = req.body;
    const botId = postBody.data?.bot_id;
    const sessionId = req.headers['ecwx-session-id'] as string;
    const hash = req.headers['ecwx-hash'] as string;

    if (!botId) {
        res.status(400).json({
            error_message: "invalid request. invalid field value",
            error_code: "40000051",
        });
        log(referenceId, "Bot ID not found in request body");
        return;
    }
    // Validate request hash
    const validationResult = await validateRequestHash(req, botId, sessionId, hash);

    // Check if validation failed
    if (validationResult === "0") {
        res.status(401).json({
            error_message: "unauthenticated",
            error_code: "40100011"
        });
        log(referenceId, `Response sent: res.status(500).json({ error_code: "internal server error", message: "Backend URL is not defined" });`);
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
            error_code: "4030011",
            error_message: "forbidden",
        });
        log(referenceId, `Response sent: res.status(403).json({ error_code: "forbidden", message: "Bot ID does not match organization ID" });`);
        return;
    }


    log(referenceId, 'Hash is valid');
    log(referenceId, `Continuing request to real backend URL: ${realBackendURL}`);

    /// pisah dari sini
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
        log(referenceId, "Send Real Backend Status to FE", ` ${realBackendResStatus}, Response Data:  ${JSON.stringify(responseData)}`);
    } catch (e) {
        res.status(500).json({
            error_code: "5000012",
            error_message: "internal server error",
        });
        log(referenceId, `Error forwarding request to backend: ${e}`);
    }
};
