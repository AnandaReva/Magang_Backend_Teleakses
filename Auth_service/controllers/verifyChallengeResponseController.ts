
import { Request, Response } from "express";
import log from '../utils/logHelper';
import { globalVar } from '../utils/globalVar';
import { createHMACSHA256HashBase64, createHMACSHA256HashHex } from "../utils/createHMACSHA256Hash";
import generateRandomString from "../utils/generateRandomString";
import calculateChallengeResponse from "../utils/calculateChallengeResponse";
import pool from '../db/config'

async function deleteChallengeResponse(full_nonce: string): Promise<void> {
    const referenceId = globalVar.getReferenceId() || 'undefined';
    try {
        log(referenceId, "Executing method: deleteChallengeResponse");
        log(referenceId, "Full nonce:", full_nonce);
        const deleteQuery = "DELETE FROM servouser.challenge_response WHERE full_nonce = $1 RETURNING *";
        log(referenceId, "Delete Challenge Response Query:", deleteQuery);
        const { rowCount, rows } = await pool.query(deleteQuery, [full_nonce]);
        if (rowCount === 0) {
            log(referenceId, "No challenge response found for deletion with full_nonce:", full_nonce);
        } else {
            log(referenceId, "Challenge response successfully deleted for full_nonce:", full_nonce);
            log(referenceId, "Deleted row(s):", rows);
        }
    } catch (error) {
        log(referenceId, "Failed to delete challenge response:", error);
    }
}

async function getUserPrivileges(userId: number): Promise<string> {
    const referenceId = globalVar.getReferenceId() || 'undefined';
    log(referenceId, "Executing method: getUserPrivileges");
    try {
        const getRoleQuery = 'SELECT role FROM servouser.user WHERE id = $1 LIMIT 1';
        log(referenceId, "Get role query:", getRoleQuery);
        const roleResult = await pool.query(getRoleQuery, [userId]);
        if (roleResult.rows.length === 0) {
            log(referenceId, "No role found for user ID:", userId);
            return "0";
        }
        const role = roleResult.rows[0].role;
        log(referenceId, "userId:", userId);
        log(referenceId, "Role from db servouser.user:", role);
        const getPrivilegesQuery = 'SELECT privileges FROM servouser.role WHERE name = $1 LIMIT 1';
        log(referenceId, "Get privileges query:", getPrivilegesQuery);
        const privilegesResult = await pool.query(getPrivilegesQuery, [role]);

        if (privilegesResult.rows.length === 0) {
            log(referenceId, "No privileges found for the role:", role);
            return "0";
        }
        const privileges = privilegesResult.rows[0].privileges;
        log(referenceId, "Role:", role);
        log(referenceId, "Privileges from db servouser.role:", privileges);
        return privileges;
    } catch (error) {
        log(referenceId, "Error retrieving user privileges:", error);
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
    const referenceId = globalVar.getReferenceId() || 'undefined';
    log(referenceId, "Execute method: handleChallengeResponseVerification");
    log(referenceId, `Request Body: ${JSON.stringify(req.body)}`);

    try {
        const { full_nonce, challenge_response } = req.body;

        const missingFields = [];
        if (!full_nonce) missingFields.push("full_nonce");
        if (!challenge_response) missingFields.push("challenge_response");

        if (missingFields.length > 0) {
            res.status(400).json({
                error_message: "invalid request",
                error_code: "40000001",
            });
            log(referenceId, `res.status(400).json: Missing fields:`, missingFields);
            return;
        }

        if (full_nonce.length != 16) {
            res.status(400).json({
                error_message: "invalid request",
                error_code: "40000002",
            });
            log(referenceId, `res.status(400).json full_nonce must be 16 characters length.`, missingFields);
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
            log(referenceId, `res.status(401).json: { error: "Challenge not valid", message: "The challenge provided is not valid. Please ensure that the full_nonce is correct." }`);
            return;
        }

        const challengeData = challengeDataResult.rows[0];
        const currentTime = BigInt(Math.floor(Date.now() / 1000));
        const challengeTimestamp = BigInt(challengeData.tstamp);

        // Check if the timestamp is within the last 60 seconds
        if (currentTime - challengeTimestamp > BigInt(60)) {
            log(referenceId, "\n ------Challenge response exceeds 60 seconds, deleting challenge response");
            res.status(401).json({
                error_message: "unauthenticated",
                error_code: "40100004"
            });
            await deleteChallengeResponse(full_nonce);
            log(referenceId, `res.status(401).json: { message: "Challenge has expired" }`, `\nrequest sent: ${JSON.stringify(req.body)}`);
            return;
        }
        // Verify challenge response
        const expectedChallengeResponse = calculateChallengeResponse(
            full_nonce,
            challengeData.saltedpassword
        );
        const isValid = expectedChallengeResponse === challenge_response;
        log(referenceId, "Expected Challenge Response:", expectedChallengeResponse);
        log(referenceId, "Compared challenge response:", challenge_response);


        // Cek if challenge response is valid
        if (isValid) {
            const session_id = generateRandomString(16);
            const nonce2 = generateRandomString(8);
            const session_secret = createHMACSHA256HashHex(
                `${full_nonce}${nonce2}`,
                challengeData.saltedpassword
            );

            log(referenceId, "   Challenge response valid");
            log(referenceId, `[ Valid Challenge Response:", ${expectedChallengeResponse},]`);
            log(referenceId, "Generate session ID and nonce2:");
            log(referenceId, `[  session_id: ${session_id} ]`);
            log(referenceId, `[  nonce2: ${nonce2} ]`);
            log(referenceId, `[  session_secret: ${session_secret}]`);

            await upsertSession(session_id, challengeData.user_id, session_secret);

            const privileges = await getUserPrivileges(challengeData.user_id);

            res.status(200).json({
                session_id,
                nonce2,
                user_data: {
                    full_name: challengeData.full_name,
                    privileges,
                },
            });
            log(
                referenceId,
                `res.status(200).json(${{
                    session_id,
                    nonce2,
                    user_data: { full_name: challengeData.full_name, privileges },
                }});`
            );


        } else {
            res.status(401).json({
                error_message: "unauthenticated",
                error_code: "40100005"
            });
            log(referenceId, `res.status(401).json: {message: "Invalid challenge response" }`, `\nrequest sent: ${JSON.stringify(req.body)}`);
        }
        await deleteChallengeResponse(full_nonce);
    } catch (e) {
        res.status(500).json({ error_code: "50000001", error_message: "Internal server Error" });
        log(referenceId, `Error during verifying challenge response: { error: "internal server error", details: "${e}" }`, `\nrequest sent: ${JSON.stringify(req.body)}`);
    }
}
