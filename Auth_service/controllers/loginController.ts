import { Request, Response } from "express";
import pool from '../db/config'

import generateTimestamp from "../utils/generateTimeStamp";
import generateRandomString from "../utils/generateRandomString";
import calculateChallengeResponse from "../utils/calculateChallengeResponse";





// Updated handleLoginRequest function with explicit schema references
export async function handleLoginRequest(req: Request, res: Response): Promise<void> {
    console.log("execute method: handleLoginRequest");
    console.log(`Request Body: ${JSON.stringify(req.body)}`)
    const timestamp = generateTimestamp();
    const client = await pool.connect();

    try {
        const { username, half_nonce } = req.body;

        // Validate each field
        const missingFields = [];
        if (!username) missingFields.push('username');
        if (!half_nonce) missingFields.push('half_nonce');

        if (missingFields.length > 0) {
            res.status(401).json({
                error: "unauthorized",
            });
            console.error(`[${timestamp}] res.status(401).json: { error: "Invalid input", missingFields: ${JSON.stringify(missingFields)} }, \nrequest sent: ${JSON.stringify(req.body)}`);
            return;
        }

        if (half_nonce.length !== 8) {
            res.status(401).json({
                error: "unauthorized",
            });
            console.error(`[${timestamp}] res.status(401).json: { error: "Invalid input", message: "half_nonce must be 8 characters long" }`);
            return;
        }

        // Get user data from the database with explicit schema
        const userQuery = 'SELECT id, salt, saltedpassword FROM servouser.user WHERE username = $1';
        const userResult = await client.query(userQuery, [username]);

        if (userResult.rowCount === 0) {
            res.status(401).json({
                message: "unauthorized",
            });
            console.error(`[${timestamp}] res.status(401).json: { timeStamp: "${timestamp}", message: "User not found" }`, { "username sent:": username });
            return;
        }

        const user = userResult.rows[0];

        // Check if there's an existing challenge for the user
        const challengeQuery = 'SELECT * FROM servouser.challenge_response WHERE user_id = $1';
        const challengeResult = await client.query(challengeQuery, [user.id.toString()]);

        const currentTime = BigInt(Math.floor(Date.now() / 1000));

        // If a challenge exists and was created within the last 10 seconds, reject the request
        if ((challengeResult.rowCount ?? 0) > 0) { // Use ?? to handle null or undefined
            const existingChallenge = challengeResult.rows[0];
            if ((currentTime - BigInt(existingChallenge.tstamp)) < 10) {
                res.status(429).json({
                    error: "Too many requests",
                });
                console.error(`[${timestamp}] res.status(429).json: { error: "Too many requests", message: "A challenge has already been generated recently. Please wait before trying again." }`);
                return;
            }
        }

        // Generate nonce1
        const nonce1 = generateRandomString(8);
        const full_nonce = `${half_nonce}${nonce1}`;
        console.log("[nonce1: ", nonce1, ']');
        console.log("[fullNonce: ", full_nonce, ']');

        const challengeResponse = calculateChallengeResponse(full_nonce, user.saltedpassword);

        // Insert or update the challenge response
        const upsertQuery = `
        INSERT INTO servouser.challenge_response (full_nonce, user_id, challenge_response, tstamp)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (full_nonce) DO UPDATE
        SET challenge_response = EXCLUDED.challenge_response,
            tstamp = EXCLUDED.tstamp
        `;

        await client.query(upsertQuery, [full_nonce, user.id, challengeResponse, currentTime]);


        console.log("Send response to frontend");
        // Send response to frontend
        res.json({
            full_nonce,
            salt: user.salt,
        });

        console.log(`[${timestamp}] Response sent: res.json.status(200):`, {
            full_nonce,
            salt: user.salt,
        });
    } catch (e) {
        res.status(500).json({
            message: "Internal server error",
        });
        console.error(`[${timestamp}] res.status(500).json: Error during handling login request`, e, ` \nrequest sent: ${JSON.stringify(req.body)}`);
    } finally {
        client.release();
    }
}
