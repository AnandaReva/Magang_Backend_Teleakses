import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
//import crypto from 'crypto';
import generateTimestamp from "../utils/generateTimeStamp";
import generateRandomString from "../utils/generateRandomString";
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
                error: "Invalid input"
            });
            console.error(`[${timestamp}] res.status(400).json: { error: "Invalid input", missingFields: ${JSON.stringify(missingFields)} }, \nrequest sent: ${JSON.stringify(req.body)}`);
            return;
        }

        if (half_nonce.length != 8) {
            res.status(400).json({
                error: "Invalid input"
            });
            console.error(`[${timestamp}] res.status(400).json: { error: "Invalid input", message: "half_nonce must be 8 characters long" }`);
            return;
        }

        // Get user data from the database
        const user = await prisma.user.findUnique({
            where: { username },
            select: { id: true, salt: true, saltedpassword: true },
        });

        if (!user) {
            res.status(401).json({
                message: "User not found",
            });
            console.error(`[${timestamp}] res.status(401).json: { timeStamp: "${timestamp}", message: "User not found" }`, { "username sent:": username });
            return;
        }

        // Check if there's an existing challenge for the user
        const existingChallenge = await prisma.challenge_response.findUnique({
            where: {
                user_id: user.id,
            },
        });

        const currentTime = BigInt(Math.floor(Date.now() / 1000));

        // If a challenge exists and was created within the last 10 seconds, reject the request
        if (existingChallenge && (currentTime - existingChallenge.tstamp) < 10) {
            res.status(429).json({
                error: "Too many requests",
                message: "A challenge has already been generated recently. Please wait before trying again.",
            });
            console.error(`[${timestamp}] res.status(429).json: { error: "Too many requests", message: "A challenge has already been generated recently. Please wait before trying again." }`);
            return;
        }


        // Generate nonce1
        const nonce1 = generateRandomString(8); 
        const fullNonce = `${half_nonce}${nonce1}`; 
        console.log("[nonce1: ", nonce1, ']')
        console.log("[fullNonce: ", fullNonce, ']')

        
        const challengeResponse = calculateChallengeResponse(fullNonce, user.saltedpassword);

        await prisma.challenge_response.upsert({
            where: {
                user_id: user.id,
            },
            update: {
                full_nonce: fullNonce,
                challenge_response: challengeResponse,
                tstamp: currentTime,
            },
            create: {
                full_nonce: fullNonce,
                user_id: user.id,
                challenge_response: challengeResponse,
                tstamp: currentTime,
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
        });
        console.error(`[${timestamp}] res.status(500).json: Error during handling login request`, e, ` \nrequest sent: ${JSON.stringify(req.body)}`);
    }
}
