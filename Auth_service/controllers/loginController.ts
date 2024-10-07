import { Request, Response } from "express";
import pool from '../db/config';
import log from '../utils/logHelper';
import { globalVar } from '../utils/globalVar';

import generateRandomString from "../utils/generateRandomString";
import calculateChallengeResponse from "../utils/calculateChallengeResponse";

// Function for upserting challenge response to database
async function upsertChallengeResponse(full_nonce: string, user_id: string, challengeResponse: string, currentTime: bigint) {
    
    const referenceId = globalVar.getReferenceId() || 'undefined';

    log(referenceId, "\n Executing method: upsertChallengeResponse");
    const client = await pool.connect();

    const upsertQuery = `
        INSERT INTO servouser.challenge_response (full_nonce, user_id, challenge_response, tstamp)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id) DO UPDATE
        SET full_nonce = EXCLUDED.full_nonce,
            challenge_response = EXCLUDED.challenge_response,
            tstamp = EXCLUDED.tstamp
    `;
    log(referenceId, "upsert query for challenge response:", upsertQuery);
    try {
        await client.query(upsertQuery, [full_nonce, user_id, challengeResponse, currentTime]);
        log(referenceId, "Challenge response upserted successfully.");
        return "success";
    } catch (upsertError) {
        log(referenceId, "Error during upsert challenge response:", upsertError);
        throw new Error("Error updating challenge response.");
    } finally {
        client.release();
    }
}

// For handling login (username and half_nonce)
export async function handleLoginRequest(req: Request, res: Response): Promise<void> {


    const referenceId = globalVar.getReferenceId() || 'undefined';
    log(referenceId, "\n Executing method: handleLoginRequest");

    try {
        // get from body request
        const { username, half_nonce } = req.body;
        const missingFields = [];

        // field validation
        if (!username) missingFields.push('username');
        if (!half_nonce) missingFields.push('half_nonce');

        if (missingFields.length > 0) {
            res.status(400).json({
                error_message: "invalid request",
                error_code: "40000001",
            });
            log(referenceId, "Missing fields:", JSON.stringify(missingFields));
            return;
        }
        if (half_nonce.length !== 8) {
            res.status(400).json({
                error_message: "invalid request",
                error_code: "40000002",
            });
            log(referenceId, "half_nonce must be 8 characters long");
            return;
        }

        const userQuery = 'SELECT id, salt, saltedpassword, iterations FROM servouser.user WHERE username = $1';
        const userResult = await pool.query(userQuery, [username]);
        if (userResult.rowCount === 0) {
            const fakeFullNonce = half_nonce + generateRandomString(8);
            const fakeSalt = generateRandomString(16);
            const fakeIterations = 0;
            log(referenceId, `Username incorrect: generating fake data. [Fake full_nonce:, ${fakeFullNonce},  Fake salt: ${fakeSalt}]`);
            res.json({
                full_nonce: fakeFullNonce,
                salt: fakeSalt,
                iterations: fakeIterations
            });
            log(referenceId, "User not found for username:", username);
            return;
        }
        const user = userResult.rows[0];

        const challengeQuery = 'SELECT tstamp FROM servouser.challenge_response WHERE user_id = $1';
        const challengeResult = await pool.query(challengeQuery, [user.id.toString()]);
        const currentTime = BigInt(Math.floor(Date.now() / 1000));

        if ((challengeResult.rowCount ?? 0) > 0) {
            const existingChallenge = challengeResult.rows[0];
            if ((currentTime - BigInt(existingChallenge.tstamp)) < 10) {
                res.status(429).json({
                    error_code: "42900001",
                    error_message: "Too many requests",
                });
                log(referenceId, "res.status(429).json:", {
                    error_code: "42900001",
                    error_message: "Too many requests, try every 10 s"
                });

                return;
            }
        }

        const nonce1 = generateRandomString(8);
        const full_nonce = `${half_nonce}${nonce1}`;

        const challengeResponse = calculateChallengeResponse(full_nonce, user.saltedpassword);
        log(referenceId, "Calculated challenge response.");

        log(referenceId, "Generated full_nonce:", full_nonce);
        log(referenceId, "User id:", user.id);
        log(referenceId, "Challenge response:", challengeResponse);
        log(referenceId, "Current Time:", currentTime);

        try {
            const upsertStatus = await upsertChallengeResponse(full_nonce, user.id, challengeResponse, currentTime);
            log(referenceId, "Upsert status:", upsertStatus);
        } catch (error) {
            log(referenceId, "Error during upsert challenge_response:", error);
            res.status(500).json({ error_code: "50000001", error_message: "Internal server Error" });
            return;
        }

        res.status(200).json({
            full_nonce,
            salt: user.salt,
            iterations: user.iterations
        });
        log(referenceId, " res.status(200) : Response sent:", {
            full_nonce,
            salt: user.salt,
            iterations: user.iterations
        });

    } catch (e) {
        log(referenceId, "Error during handling login request:", e);
        res.status(500).json({ error_code: "50000002", error_message: "Internal server Error" });
    }
}
