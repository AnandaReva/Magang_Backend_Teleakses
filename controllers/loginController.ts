import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
//import crypto from 'crypto';
import generateTimestamp from "../utils/generateTimeStamp";
import generateRandomString from "../utils/generateRandomString";
import createHMACSHA256Hash from "../utils/createHMACSHA256Hash";
import calculateChallengeResponse from "../utils/calculateChallengeResponse";

const prisma = new PrismaClient();


export async function handleLoginRequest(
    req: Request,
    res: Response
): Promise<void> {
    console.log("execute method: handleLoginRequest");
    const timestamp = generateTimestamp();
    try {
        const { username, half_nonce } = req.body;

        // Validate each field
        const missingFields = [];
        if (!username) missingFields.push('username');
        if (!half_nonce) missingFields.push('half_nonce');

        console.log("check missing field");
        if (missingFields.length > 0) {
            res.status(400).json({
                error: "Invalid input",
                missingFields
            });
            console.error(`[${timestamp}] res.status(400).json: { error: "Invalid input", missingFields: ${JSON.stringify(missingFields)} }, \nrequest sent: ${JSON.stringify(req.body)}`);
            return;
        }

        if (half_nonce.length != 8) {
            res.status(400).json({
                error: "Invalid input",
                message: "half_nonce must be 8 characters long"
            });
            console.error(`[${timestamp}] res.status(400).json: { error: "Invalid input", message: "half_nonce must be 8 characters long" }`);
            return;
        }
        //get salt, and salted passsword from db for the username
        const user = await prisma.user.findUnique({
            where: { username },
            select: { id: true, salt: true, salted_password: true },
        });

        if (!user) {
            res.status(401).json({
                message: "User not found",
                error: "User not registered in database"
            });
            console.error(`[${timestamp}] res.status(401).json: { timeStamp: "${timestamp}", message: "User not found", error: "User not registered in database" }`, { "username sent:": username });
            return;
        }

        // Generate nonce1
        const nonce1 = generateRandomString(8); //generate nonce1 (random 8 alphanumeric lowercase characters)
        const fullNonce = `${half_nonce}${nonce1}`; //full nonce = half nonce + nonce1
        console.log("[nonce1: ", nonce1, ']')
        console.log("[fullNonce: ", fullNonce, ']')

        //challenge_response = hmac-sha256(key=salted password, message = full nonce) in base64
        const challengeResponse = calculateChallengeResponse(fullNonce, user.salted_password);


        // Save full_nonce, challenge_response
        await prisma.challenge_response.create({
            data: {
                full_nonce: fullNonce,
                user_id: user.id,
                challenge_response: challengeResponse,
                tstamp: Math.floor(Date.now() / 1000)
            },
        });


        console.log("Send response to frontend");
        // Send response to frontend
        res.json({
            full_nonce: fullNonce,
            salt: user.salt,
        });

        console.log(`[${timestamp}] Response sent: res.json.status(200):`, {
            full_nonce: fullNonce,
            salt: user.salt,
        });
    } catch (e) {
        res.status(500).json({
            message: "Internal server error",
            error: e
        });
        console.error(`[${timestamp}] res.status(500).json: Error during handling login request`, e, ` \nrequest sent: ${JSON.stringify(req.body)}`);
    }
}
