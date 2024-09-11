
import { Request, Response } from "express";
import generateTimestamp from "../utils/generateTimeStamp";
import { createHMACSHA256HashBase64, createHMACSHA256HashHex } from "../utils/createHMACSHA256Hash";
import generateRandomString from "../utils/generateRandomString";
import calculateChallengeResponse from "../utils/calculateChallengeResponse";
import pool from '../db/config'

async function deleteChallengeResponse(full_nonce: string): Promise<void> {
    try {
        console.log("Executing method: deleteChallengeResponse");
        console.log("Full nonce: ", full_nonce);
        const deleteQuery = "DELETE FROM servouser.challenge_response WHERE full_nonce = $1 RETURNING *";
        console.log("Delete Challenge Response Query: ", deleteQuery);
        const { rowCount, rows } = await pool.query(deleteQuery, [full_nonce]);
        if (rowCount === 0) {
            console.error("No challenge response found for deletion with full_nonce:", full_nonce);
        } else {
            console.log("Challenge response successfully deleted for full_nonce:", full_nonce);
            console.log("Deleted row(s):", rows);
        }
    } catch (error) {
        console.error("Failed to delete challenge response:", error);
    }
}

async function getUserPrivileges(userId: number): Promise<string> {
    console.log("Executing method: getUserPrivileges");
    try {
        //get role from user
        const getRoleQuery = 'SELECT role FROM servouser.user WHERE id = $1 LIMIT 1';
        console.log("get role query:", getRoleQuery);
        const roleResult = await pool.query(getRoleQuery, [userId]);
        if (roleResult.rows.length === 0) {
            console.log("No role found for user ID:", userId);
            return "0";
        }
        const role = roleResult.rows[0].role;
        console.log("userId: ", userId)
        console.log("role from db servouser.user:", role)
        // Get privileges from role
        const getPrivilegesQuery = 'SELECT privileges FROM servouser.role WHERE name = $1 LIMIT 1';
        console.log("get privilages query:", getPrivilegesQuery);
        const privilegesResult = await pool.query(getPrivilegesQuery, [role]);

        if (privilegesResult.rows.length === 0) {
            console.log("No privileges found for the role:", role);
            return "0";
        }
        const privileges = privilegesResult.rows[0].privileges;
        console.log("role: ", role)
        console.log("privileges from db servouser.role: ", privileges);
        return privileges;
    } catch (error) {
        console.error("Error retrieving user privileges:", error);
        return "0";
    }
}

async function upsertSession(session_id: string, user_id: string, session_secret: string) {
    console.log("Executing method: upsertSession");

    const queryUpsertSession = `
        INSERT INTO servouser.session (session_id, user_id, session_secret, tstamp, st)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_id) DO UPDATE
        SET session_id = EXCLUDED.session_id,
            session_secret = EXCLUDED.session_secret,
            tstamp = EXCLUDED.tstamp,
            st = EXCLUDED.st
    `;
    try {
        await pool.query(queryUpsertSession, [
            session_id,
            user_id,
            session_secret,
            Math.floor(Date.now() / 1000),
            1,
        ]);
        console.log("Session upserted successfully.");
        return "success";
    } catch (upsertError) {
        console.error(`Error during upsert session: `, upsertError);
        throw new Error("Error updating session.");
    }
}


export async function handleChallengeResponseVerification(
    req: Request,
    res: Response
): Promise<void> {
    console.log("execute method: handleChallengeResponseVerification");
    console.log(`Request Body: ${JSON.stringify(req.body)}`)
    const timestamp = generateTimestamp();
    try {
        const { full_nonce, challenge_response } = req.body;

        const missingFields = [];
        if (!full_nonce) missingFields.push("full_nonce");
        if (!challenge_response) missingFields.push("challenge_response");

        if (missingFields.length > 0) {
            res.status(400).json({
                error_message: "invalid request. invalid field value",
                error_code: "40000001",
            });
            console.error(
                `[${timestamp}] res.status(400).json: Missing fields:`,
                missingFields
            );
            return;
        }

        if (full_nonce.length != 16) {
            res.status(400).json({
                error_message: "invalid request. invalid field value",
                error_code: "40000002",
            });
            console.error(
                `[${timestamp}] res.status(400).json full_nonce must 16 characters length.`,
                missingFields
            );
            return;
        }
        // Find challenge response in DB
        const challengeDataResult = await pool.query(
            `SELECT cr.*, u.saltedpassword, u.full_name, u.id as user_id 
            FROM servouser.challenge_response cr
            JOIN servouser.user u ON cr.user_id = u.id
            WHERE cr.full_nonce = $1`,
            [full_nonce]
        );
        if (challengeDataResult.rowCount === 0) {
            res.status(401).json({
                error_message: "unauthenticated",
                error_code: "40100003"
            });
            console.error(
                `[${timestamp}] res.status(401).json: { error: "Challenge not valid", message: "The challenge provided is not valid. Please ensure that the full_nonce is correct." }`
            );
            return;
        }

        const challengeData = challengeDataResult.rows[0];
        const currentTime = BigInt(Math.floor(Date.now() / 1000));
        const challengeTimestamp = BigInt(challengeData.tstamp);

        // Check if the timestamp is within the last 60 seconds
        if (currentTime - challengeTimestamp > BigInt(60)) {
            console.log("\n ------Challenge response exceeds 60 seconds, deleting challenge reponse")
            res.status(401).json({
                error_message: "unauthenticated",
                error_code: "40100004"
            });
            await deleteChallengeResponse(full_nonce);
            console.error(
                `[${timestamp}] res.status(401).json: { message: "Challenge has expired" }`,
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


        // Cek if challenge response is valid
        if (isValid) {
            // Generate session id - 16 random alphanumeric lowercase characters
            const session_id = generateRandomString(16);
            // Generate nonce2 = 8 random alphanumeric lowercase characters
            const nonce2 = generateRandomString(8);
            // session secret = hmac-sha256(key=salted password, message = full nonce + nonce2)
            const session_secret = createHMACSHA256HashHex(
                `${full_nonce}${nonce2}`,
                challengeData.saltedpassword
            );

            console.log("   Challenge response valid");
            console.log("[Valid Challenge Response: ", expectedChallengeResponse, "]");
            console.log(`Generate session ID and nonce2:`);
            console.log(`[  session_id: ${session_id} ]`);
            console.log(`[  nonce2: ${nonce2} ]`);
            console.log(`[  session_secret: ${session_secret}]`);

            // Do upsert query
            await upsertSession(session_id, challengeData.user_id, session_secret);

            // get user pivilage
            const privileges = await getUserPrivileges(challengeData.user_id)

            res.status(200).json({
                session_id,
                nonce2,
                user_data: {
                    full_name: challengeData.full_name,
                    privileges,
                },
            });
            console.log("res.status(200).json(", JSON.stringify({
                session_id,
                nonce2,
                user_data: {
                    full_name: challengeData.full_name,
                    privileges,
                },
            }), ");");

        } else {
            res.status(401).json({
                error_message: "unauthenticated",
                error_code: "40100005"
            });
            console.error(
                `[${timestamp}] res.status(401).json: { timeStamp: "${timestamp}", message: "Invalid challenge response" }`,
                ` \nrequest sent: ${JSON.stringify(req.body)}`
            );
        }
        await deleteChallengeResponse(full_nonce);
    } catch (e) {
        res.status(500).json({ error_code: "50000001", error_message: "Internal server Error" });
        console.error(
            `[${timestamp}] Error during verifying challenge response: { error: "internal server error", details: "${e}" }`,
            ` \nrequest sent: ${JSON.stringify(req.body)}`
        );
    }
}
