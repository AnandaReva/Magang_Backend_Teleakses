import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
//import crypto from 'crypto';
import { createHmac } from 'crypto';
const prisma = new PrismaClient();

function createHMACSHA256Hash(data: string, key: string): string {
    console.log("Executing method: createHMACSHA256Hash");
    console.log(`[ Data: ${data}]`);
    console.log(`[ Key: ${key}]`);

    const hmacSHA256Hash = createHmac('sha256', key)
        .update(data)
        .digest('base64');
    console.log("[HMAC SHA256 result: ", hmacSHA256Hash, "] \n ----------------");
    return hmacSHA256Hash;
}

function calculateChallengeResponse(full_nonce: string, salted_password: string): string {
    console.log("Executing method: calculateChallengeResponse");
    console.log(`[Full Nonce: ${full_nonce}]`);
    console.log(`[Salted Password: ${salted_password}]`);

    // Calculate the challenge response using HMAC SHA256 hash
    const challengeResponse = createHMACSHA256Hash(full_nonce, salted_password);

    console.log("[Challenge Response: ", challengeResponse, "] \n ----------------");
    return challengeResponse;
}


// Generate random alphanumeric string
function generateRandomString(length: number): string {
    console.log("execute method: generateRandomString");
    const charset = "abcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * charset.length);
        result += charset[randomIndex];
    }
    console.log("result:", result);
    return result;
}

// Generate ISO 8601 timestamp
function generateTimestamp(): string {
    return new Date().toISOString();
}


export async function handleLoginRequest(
    req: Request,
    res: Response
): Promise<void> {

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress

    console.log(`API ADDRESS: ${ip}`);
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
            res.status(404).json({
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
