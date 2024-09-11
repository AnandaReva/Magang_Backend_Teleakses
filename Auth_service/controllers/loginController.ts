import { Request, Response } from "express";
import pool from '../db/config';
import generateTimestamp from "../utils/generateTimeStamp";
import generateRandomString from "../utils/generateRandomString";
import calculateChallengeResponse from "../utils/calculateChallengeResponse";

// function for upserting challenge respose to database
async function upsertChallengeResponse(full_nonce: string, user_id: string, challengeResponse: string, currentTime: bigint) {

    //prepare query
    const upsertQuery = `
        INSERT INTO servouser.challenge_response (full_nonce, user_id, challenge_response, tstamp)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id) DO UPDATE
        SET full_nonce = EXCLUDED.full_nonce,
            challenge_response = EXCLUDED.challenge_response,
            tstamp = EXCLUDED.tstamp
    `;
    console.log("Executing upsert query for challenge response: ", {
        query: upsertQuery,
        params: [full_nonce, user_id, challengeResponse, currentTime]
    });

    // do Upsert query
    try {
        await pool.query(upsertQuery, [full_nonce, user_id, challengeResponse, currentTime]);
        console.log("Challenge response upserted successfully.");
        return "success";
    } catch (upsertError) {
        console.error(`Error during upsert challenge response: `, upsertError);
        throw new Error("Error updating challenge response.");
    }
}

// For handling login (username and half_nonce)
export async function handleLoginRequest(req: Request, res: Response): Promise<void> {
    console.log("execute method: handleLoginRequest");
    console.log(`Request Body: ${JSON.stringify(req.body)}`);
    const timestamp = generateTimestamp();
    // const client = await pool.connect();

    try {
        // get from body request
        const { username, half_nonce } = req.body;
        const missingFields = [];

        // validation
        if (!username) missingFields.push('username');
        if (!half_nonce) missingFields.push('half_nonce');

        if (missingFields.length > 0) {
            res.status(400).json({
                error_message: "invalid request. invalid field value",
                error_code: "40000001",
            });
            console.error(`[${timestamp}] Missing fields: ${JSON.stringify(missingFields)}`);
            return;
        }
        if (half_nonce.length !== 8) {
            res.status(400).json({
                error_message: "invalid request. invalid field value",
                error_code: "40000002",
            });
            console.error(`[${timestamp}] half_nonce must be 8 characters long`);
            return;
        }

        const userQuery = 'SELECT id, salt, saltedpassword, iterations FROM servouser.user WHERE username = $1';
        const userResult = await pool.query(userQuery, [username]);
        if (userResult.rowCount === 0) {
            const fakeFullNonce = half_nonce + generateRandomString(8);
            const fakeSalt = generateRandomString(8);
            console.log("--username incorrect: generating fake data: ", "Fake full_nonce: ", fakeFullNonce, "Fake salt:", fakeSalt);
            res.json({
                full_nonce: fakeFullNonce,
                salt: fakeSalt,
            });
            console.error(`[${timestamp}] User not found for username: ${username}`);
            return;
        }
        const user = userResult.rows[0];

        const challengeQuery = 'SELECT * FROM servouser.challenge_response WHERE user_id = $1';
        const challengeResult = await pool.query(challengeQuery, [user.id.toString()]);
        const currentTime = BigInt(Math.floor(Date.now() / 1000));

        if ((challengeResult.rowCount ?? 0) > 0) {
            const existingChallenge = challengeResult.rows[0];
            if ((currentTime - BigInt(existingChallenge.tstamp)) < 10) {
                res.status(429).json({
                    error: "Too many requests",
                });
                console.error(`[${timestamp}] Too many requests for user_id: ${user.id}`);
                return;
            }
        }

        // generate nonce1
        const nonce1 = generateRandomString(8);
        // fullnoce = half_nonce = nonce1 (cancate)
        const full_nonce = `${half_nonce}${nonce1}`;
        console.log("Generated full_nonce: ", full_nonce);


        //calculate challenge_response 
        const challengeResponse = calculateChallengeResponse(full_nonce, user.saltedpassword);
        console.log("Calculated challenge response.");

        // do upsert query schllenge_response
        try {
            const upsertStatus = await upsertChallengeResponse(full_nonce, user.id, challengeResponse, currentTime);
            console.log(`Upsert status: ${upsertStatus}`);
        } catch (error) {
            console.error(`[${timestamp}] Error during upsert challenge_response: `, error);
            res.status(500).json({ error_code: "50000001", error_message: "Internal server Error" });
            return;
        }
        //response to FE
        res.json({
            full_nonce,
            salt: user.salt,
            iterations: user.iterations
        });

        console.log("res.status(200).json(", JSON.stringify({
            full_nonce,
            salt: user.salt,
            iterations: user.iterations
        }), ");");

        console.log(`[${timestamp}] Response sent successfully.`);
    } catch (e) {
        console.error(`[${timestamp}] Error during handling login request: `, e);
        res.status(500).json({ error_code: "50000002", error_message: "Internal server Error" });
    }
}
