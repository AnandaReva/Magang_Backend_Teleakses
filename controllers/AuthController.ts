import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import crypto from 'crypto';

const prisma = new PrismaClient();

// Function to create HMAC SHA256 hash
function createHMACSHA256Hash(data: string, secretKey: string): string {
  console.log("execute method: createHMACSHA256Hash" )
    return crypto.createHmac('sha256', secretKey).update(data).digest('base64');
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

function calculateChallengeResponse(fullNonce: string, salted_password: string): string {
  console.log("execute method: calculateChallengeResponse");
  return createHMACSHA256Hash(fullNonce, salted_password);
}

// Generate ISO 8601 timestamp
function generateTimestamp(): string {
  return new Date().toISOString();
}

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

    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true, salt: true, salted_password: true },
    });

    if (!user) {
      res.status(404).json({
        message: "User not found",
        error: "User not registered in database"
      });
      console.error(`[${timestamp}] res.status(404).json: { timeStamp: "${timestamp}", message: "User not found", error: "User not registered in database" }`, { "username sent:": username });
      return;
    }

    // Generate nonce1
    const nonce1 = generateRandomString(8);
    const fullNonce = `${half_nonce}${nonce1}`;

    // Calculate challengeResponse using the updated function
    const challengeResponse = calculateChallengeResponse(fullNonce, user.salted_password);
    console.log("challengeResponse:", challengeResponse);
    console.log("Send response to frontend");

    // Save challenge_response to DB
    await prisma.challenge_response.create({
      data: {
        full_nonce: fullNonce,
        user_id: user.id,
        challenge_response: challengeResponse,
      },
    });

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

    // Find the challenge response in DB
    const challenge = await prisma.challenge_response.findUnique({
      where: { full_nonce },
      include: { user: true }, // Include user relationship
    });

    if (!challenge) {
      res.status(401).json({
        error: "Challenge not valid",
        message: "The challenge provided is not valid. Please ensure that the full_nonce is correct and try again."
      });
      console.error(`[${timestamp}] res.status(401).json: { error: "Challenge not valid", message: "The challenge provided is not valid. Please ensure that the full_nonce is correct." }`, ` \nrequest sent: ${JSON.stringify(req.body)}`);
      return;
    }

    // Verify challenge response
    const expectedChallengeResponse = calculateChallengeResponse(full_nonce, challenge.user.salted_password);
    const isValid = expectedChallengeResponse === challenge_response;

    console.log("check challenge response");
    if (isValid) {
      // Generate session ID and nonce2
      const session_id = generateRandomString(16);
      const nonce2 = generateRandomString(8);
      const session_secret = createHMACSHA256Hash(`${full_nonce}${nonce2}`, challenge.user.salted_password);

      console.log("challenge response valid");
      console.log(`[${timestamp}] ,  Generate session ID and nonce2: 
        session_id: ${session_id}, nonce2: ${nonce2}, session_secret: ${session_secret}`);

      await prisma.session.create({
        data: {
          session_id,
          user_id: challenge.user_id,
          session_secret,
          tstamp: Math.floor(Date.now() / 1000),
          st: 1,
        },
      });

      const userData = {
        user_id: challenge.user.id.toString(),
        fullname: challenge.user.fullname,
      };

      console.log(" Send response to frontend");

      res.status(200).json({
        session_id,
        nonce2,
        userData
      });
      console.log(`[${timestamp}] status(200).json: Challenge response is valid:`, {
        session_id,
        nonce2,
        userData
      });
    } else {
      res.status(400).json({
        timeStamp: timestamp,
        message: "Invalid challenge response"
      });
      console.error(`[${timestamp}] res.status(400).json: { timeStamp: "${timestamp}", message: "Invalid challenge response" }`, ` \nrequest sent: ${JSON.stringify(req.body)}`);
    }
  } catch (e) {
    res.status(500).json({
      timeStamp: timestamp,
      error: "Internal server error : ", e
    });
    console.error(`[${timestamp}] Error during verifying challenge response: { error: "Internal server error", details: "${e}" }`, ` \nrequest sent: ${JSON.stringify(req.body)}`);
  }
}
