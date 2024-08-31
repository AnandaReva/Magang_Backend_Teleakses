import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
//import crypto from 'crypto';
import generateTimestamp from "../utils/generateTimeStamp";
import createHMACSHA256Hash from "../utils/createHMACSHA256Hash";
import generateRandomString from "../utils/generateRandomString";
import calculateChallengeResponse from "../utils/calculateChallengeResponse";
const prisma = new PrismaClient();







// delete challenge response
async function deleteChallengeResponse(full_nonce: string): Promise<void> {
    try {
        console.log("execute method: deleteChallengeResponse")
        console.log("fullNonce: ", full_nonce)
        const existingChallenge = await prisma.challenge_response.findFirst({
            where: { full_nonce: full_nonce },
        });
        if (!existingChallenge) {
            console.error("Challenge response not found for deletion:", full_nonce);
            return;
        }
        await prisma.challenge_response.delete({
            where: { full_nonce: full_nonce },
        });
        console.log("[Challenge response deleted:", full_nonce, ']');
    } catch (error) {
        console.error("Failed to delete challenge response:", error);
    }
}







// Handle challenge response verification
export async function handleChallengeResponseVerification(
    req: Request,
    res: Response
): Promise<void> {
    console.log("execute method: handleChallengeResponseVerification");
    const timestamp = generateTimestamp();
    try {
        const { full_nonce, challenge_response } = req.body;

        const missingFields = [];
        if (!full_nonce) missingFields.push('full_nonce');
        if (!challenge_response) missingFields.push('challenge_response');

        if (missingFields.length > 0) {
            res.status(400).json({
                error: "Invalid input",
                missingFields,
            });
            console.error(`[${timestamp}] res.status(400).json: Missing fields:`, missingFields, ` \nrequest sent: ${JSON.stringify(req.body)}`);
            return;
        }

        //verify challenge response

        // Find  challenge response in DB
        const challengeData = await prisma.challenge_response.findUnique({
            where: { full_nonce },
            include: { user: true },
        });

        if (!challengeData) {
            res.status(401).json({
                error: "Challenge not valid",
                message: "The challenge provided is not valid. Please ensure that the full_nonce is correct"
            });
            console.error(`[${timestamp}] res.status(401).json: { error: "Challenge not valid", message: "The challenge provided is not valid. Please ensure that the full_nonce is correct." }`, ` \nrequest sent: ${JSON.stringify(req.body)}`);
            return;
        }


        const currentTime = BigInt(Math.floor(Date.now() / 1000)); // Current time in s
        const challengeTimestamp = BigInt(challengeData.tstamp); // BigInt data type

        // Check if the timestamp is within the last 60 seconds
        if (currentTime - challengeTimestamp > BigInt(60)) {
            res.status(400).json({
                message: "Challenge has expired"
            });
            await deleteChallengeResponse(full_nonce)
            console.error(`[${timestamp}] res.status(400).json: { message: "Challenge has expired" }`, ` \nrequest sent: ${JSON.stringify(req.body)}`);
            return;
        }

        // Verify challenge response
        const expectedChallengeResponse = calculateChallengeResponse(full_nonce, challengeData.user.salted_password);
        const isValid = expectedChallengeResponse === challenge_response;
        console.log("expected Challenge Response: ", expectedChallengeResponse)
        console.log("compared challange rsponse: ", challenge_response, '\n -------------')
        if (isValid) {


            // generate session id - 16 random alphanumeric lowercase characters
            const session_id = generateRandomString(16);
            // generate nonce2 = 8 random alphanumeric lowercase characters
            const nonce2 = generateRandomString(8);
            // session secret = hmac-sha256(key=salted password, message = full nonce + nonce2
            const session_secret = createHMACSHA256Hash(`${full_nonce}${nonce2}`, challengeData.user.salted_password);

            console.log("challenge response valid");
            console.log("[  Valid Challenge Response: ", expectedChallengeResponse, ']')
            console.log(`Generate session ID and nonce2:`);
            console.log(`[  session_id: ${session_id} ]`);
            console.log(`[  nonce2: ${nonce2} ]`);
            console.log(`[  session_secret: ${session_secret}]`);

            await prisma.session.create({
                data: {
                    session_id,
                    user_id: challengeData.user_id,
                    session_secret,
                    tstamp: Math.floor(Date.now() / 1000),
                    st: 1,
                },
            });

            const user_data = {
                user_id: challengeData.user.id.toString(),
                fullname: challengeData.user.fullname,
            };

            console.log(" Send response to frontend");

            res.status(200).json({
                session_id,
                nonce2,
                user_data
            });
            console.log(`[${timestamp}] status(200).json: Challenge response is valid:`, {
                session_id,
                nonce2,
                user_data
            });


        } else {
            res.status(400).json({
                message: "Invalid challenge response"
            });
            console.error(`[${timestamp}] res.status(400).json: { timeStamp: "${timestamp}", message: "Invalid challenge response" }`, ` \nrequest sent: ${JSON.stringify(req.body)}`);
        }
        

        await deleteChallengeResponse(full_nonce);


    } catch (e) {
        res.status(500).json({
            timeStamp: timestamp,
            error: "Internal server error : ", e
        });
        console.error(`[${timestamp}] Error during verifying challenge response: { error: "Internal server error", details: "${e}" }`, ` \nrequest sent: ${JSON.stringify(req.body)}`);
    }
}