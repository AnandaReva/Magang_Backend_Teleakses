
import { Request, Response } from "express";
import generateTimestamp from "../utils/generateTimeStamp";
import createHMACSHA256Hash from "../utils/createHMACSHA256Hash";
import generateRandomString from "../utils/generateRandomString";
import calculateChallengeResponse from "../utils/calculateChallengeResponse";


import pool from '../db/config'


async function deleteChallengeResponse(full_nonce: string): Promise<void> {
    try {
        console.log("execute method: deleteChallengeResponse");
        console.log("fullNonce: ", full_nonce);

        const { rowCount } = await pool.query(
            "DELETE FROM servuoser.challenge_response WHERE full_nonce = $1 RETURNING *",
            [full_nonce]
        );

        if (rowCount === 0) {
            console.error("Challenge response not found for deletion:", full_nonce);
        } else {
            console.log("[Challenge response deleted:", full_nonce, "]");
        }
    } catch (error) {
        console.error("Failed to delete challenge response:", error);
    }
}


export async function handleChallengeResponseVerification(
    req: Request,
    res: Response
): Promise<void> {
    console.log("execute method: handleChallengeResponseVerification");
    const timestamp = generateTimestamp();
    try {
        const { full_nonce, challenge_response } = req.body;

        const missingFields = [];
        if (!full_nonce) missingFields.push("full_nonce");
        if (!challenge_response) missingFields.push("challenge_response");

        if (missingFields.length > 0) {
            res.status(400).json({
                error: "Invalid input",
                missingFields,
            });
            console.error(
                `[${timestamp}] res.status(400).json: Missing fields:`,
                missingFields,
                ` \nrequest sent: ${JSON.stringify(req.body)}`
            );
            return;
        }

        // Find challenge response in DB
        const challengeDataResult = await pool.query(
            `SELECT cr.*, u.saltedpassword, u.full_name, u.id as user_id 
            FROM servuoser.challenge_response cr
            JOIN servuoser.user u ON cr.user_id = u.id
            WHERE cr.full_nonce = $1`,
            [full_nonce]
        );

        if (challengeDataResult.rowCount === 0) {
            res.status(401).json({
                error: "Challenge not valid",
                message:
                    "The challenge provided is not valid. Please ensure that the full_nonce is correct",
            });
            console.error(
                `[${timestamp}] res.status(401).json: { error: "Challenge not valid", message: "The challenge provided is not valid. Please ensure that the full_nonce is correct." }`,
                ` \nrequest sent: ${JSON.stringify(req.body)}`
            );
            return;
        }

        const challengeData = challengeDataResult.rows[0];
        const currentTime = BigInt(Math.floor(Date.now() / 1000)); // Current time in seconds
        const challengeTimestamp = BigInt(challengeData.tstamp);

        // Check if the timestamp is within the last 60 seconds
        if (currentTime - challengeTimestamp > BigInt(60)) {
            res.status(400).json({
                message: "Challenge has expired",
            });
            await deleteChallengeResponse(full_nonce);
            console.error(
                `[${timestamp}] res.status(400).json: { message: "Challenge has expired" }`,
                ` \nrequest sent: ${JSON.stringify(req.body)}`
            );
            return;
        }

        // Verify challenge response
        const expectedChallengeResponse = calculateChallengeResponse(
            full_nonce,
            challengeData.saltedpassword
        );
        const isValid = expectedChallengeResponse === challenge_response;
        console.log("expected Challenge Response: ", expectedChallengeResponse);
        console.log(
            "compared challenge response: ",
            challenge_response,
            "\n -------------"
        );

        if (isValid) {
            // Generate session id - 16 random alphanumeric lowercase characters
            const session_id = generateRandomString(16);
            // Generate nonce2 = 8 random alphanumeric lowercase characters
            const nonce2 = generateRandomString(8);
            // session secret = hmac-sha256(key=salted password, message = full nonce + nonce2)
            const session_secret = createHMACSHA256Hash(
                `${full_nonce}${nonce2}`,
                challengeData.saltedpassword
            );

            console.log("challenge response valid");
            console.log("[Valid Challenge Response: ", expectedChallengeResponse, "]");
            console.log(`Generate session ID and nonce2:`);
            console.log(`[  session_id: ${session_id} ]`);
            console.log(`[  nonce2: ${nonce2} ]`);
            console.log(`[  session_secret: ${session_secret}]`);

            console.log("Inserting session data to database");
            await pool.query(
                `INSERT INTO servuoser.session (session_id, user_id, session_secret, tstamp, st)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (user_id) DO UPDATE
                 SET session_id = EXCLUDED.session_id,
                     session_secret = EXCLUDED.session_secret,
                     tstamp = EXCLUDED.tstamp,
                     st = EXCLUDED.st`,
                [
                    session_id,
                    challengeData.user_id,
                    session_secret,
                    Math.floor(Date.now() / 1000),
                    1,
                ]
            );

            const user_data = {
                user_id: challengeData.user_id.toString(),
                full_name: challengeData.full_name,
            };

            console.log(" Send response to frontend");
            res.status(200).json({
                session_id,
                nonce2,
                user_data,
            });
            console.log(
                `[${timestamp}] status(200).json: Challenge response is valid:`,
                {
                    session_id,
                    nonce2,
                    user_data,
                }
            );
        } else {
            res.status(400).json({
                message: "Invalid challenge response",
            });
            console.error(
                `[${timestamp}] res.status(400).json: { timeStamp: "${timestamp}", message: "Invalid challenge response" }`,
                ` \nrequest sent: ${JSON.stringify(req.body)}`
            );
        }

        await deleteChallengeResponse(full_nonce);
    } catch (e) {
        res.status(500).json({
            error: "Internal server error",
        });
        console.error(
            `[${timestamp}] Error during verifying challenge response: { error: "Internal server error", details: "${e}" }`,
            ` \nrequest sent: ${JSON.stringify(req.body)}`
        );
    }
}
