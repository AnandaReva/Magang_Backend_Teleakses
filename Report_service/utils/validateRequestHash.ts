import { PrismaClient } from "@prisma/client";
import createHMACSHA256Hash from "../utils/createHMACSHA256Hash";
import { Request } from "express";

const prisma = new PrismaClient();

export default async function validateRequestHash(req: Request): Promise<boolean> {
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
            console.error(`Session data with id = [ ${sessionId} ] not found in database \n`);
            return false;
        }

        const sessionSecret = sessionData.session_secret;
        const postBody = req.body;

        const postBodyString = JSON.stringify(postBody);
        const hashExpected = createHMACSHA256Hash(postBodyString, sessionSecret.toString());
        console.log("Session Secret from DB:", sessionSecret);
        console.log("Post Body from FE (stringify):", postBodyString);
        console.log(`Expected Hash: [${hashExpected}]`);
        console.log(`Received Hash from header: [${hashReceived}]`);

        return hashReceived === hashExpected;
    } catch (error) {
        console.error(`[${timeStamp}] Error while validating hash:`, error);
        return false;
    }
}
