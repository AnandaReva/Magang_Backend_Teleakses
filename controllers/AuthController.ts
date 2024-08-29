import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import { timeStamp } from "console";


const prisma = new PrismaClient();

// Generate random alphanumeric string
function generateRandomString(length: number): string {
  const charset = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    result += charset[randomIndex];
  }
  return result;
}

// Simulate challengeResponse calculation
function calculateChallengeResponse(fullNonce: string, salt: string): string {
  return crypto
  .createHmac("sha256", salt)
  .update(fullNonce)
  .digest("hex");
}

export async function handleLoginRequest(
  req: Request,
  res: Response
): Promise<void> {
  const timestampInSeconds = Math.floor(Date.now() / 1000);
  try {
    const { username, half_nonce } = req.body;

    // Validate each field and determine which ones are missing
    const missingFields = [];
    if (!username) missingFields.push('username');
    if (!half_nonce) missingFields.push('half_nonce');

    if (missingFields.length > 0) {
      res.status(400).json({
        error: "Invalid input",
        missingFields
      });
      console.log(' res.status(400).json :Missing fields:', missingFields, 'at timestamp:', timestampInSeconds);
      
      return;
    }

    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true, salt: true },
    });

    if (!user) {
      res.status(404).json({
        message: "User not found",
        error: "User not registered in database"
      });
      console.log("res.status(404).json: User not found, ensure username exists in database:", username, 'at timestamp:', timestampInSeconds);
      return;
    }

    // Generate nonce1
    const nonce1 = generateRandomString(8);
    const fullNonce = `${half_nonce}${nonce1}`;

    // Calculate challengeResponse
    const challengeResponse = calculateChallengeResponse(fullNonce, user.salt);

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

    console.log("Response sent at timestamp: res.json", timestampInSeconds, "with data:", {
      full_nonce: fullNonce,
      salt: user.salt,
    });
  } catch (e) {
    res.status(500).json({
      message: "Internal server error",
      error: e
    });
    console.error("res.status(500).json: Error handling login request at timestamp:", timestampInSeconds, e, req.body);
  }
}

// Handle challenge response verification
export async function handleChallengeResponseVerification(
  req: Request,
  res: Response
): Promise<void> {
  const timestampInSeconds = Math.floor(Date.now() / 1000);
  try {
    const { full_nonce, challenge_response } = req.body;

    const missingFields = [];
    if (!full_nonce) missingFields.push('full_nonce');
    if (!challenge_response) missingFields.push('challenge_response');

    if (missingFields.length > 0) {
      // Log the request body for debugging
      console.log(`Timestamp ${timestampInSeconds}: res.status(400).json - Missing fields:`, missingFields);

      // Send response with missing fields
      res.status(400).json({
        error: "Invalid input",
        missingFields,
      });
      return;
    }

    // Find the challenge response in DB
    const challenge = await prisma.challenge_response.findUnique({
      where: { full_nonce },
      include: { user: true }, // Include user relationship
    });

    if (!challenge) {
      // Send response with additional information
      console.log(`Timestamp ${timestampInSeconds}: res.status(401).json - Challenge not valid: The provided full_nonce did not match any existing challenge.`);

      res.status(401).json({
        error: "Challenge not valid",
        errorCode: "CHALLENGE_NOT_VALID", // Kode error yang jelas
        message: "The challenge provided is not valid. Please ensure that the full_nonce is correct and try again."
      });
      return;
    }

    // Verify challenge response
    const expectedChallengeResponse = calculateChallengeResponse(full_nonce, challenge.user.salt);
    const isValid = expectedChallengeResponse === challenge_response;

    if (isValid) {
      // Generate session ID and nonce2
      const session_id = generateRandomString(16);
      const nonce2 = generateRandomString(8);
      const session_secret = crypto
        .createHmac("sha256", challenge.user.salted_password)
        .update(`${full_nonce}${nonce2}`)
        .digest("base64");

      // Save Session to DB
      await prisma.session.create({
        data: {
          session_id,
          user_id: challenge.user_id,
          session_secret,
          tstamp: timestampInSeconds,
          st: 1,
        },
      });

      const userData = {
        id: challenge.user.id.toString(), // Convert BigInt to string
        username: challenge.user.username,
        fullname: challenge.user.fullname,
        salt: challenge.user.salt
      };

      // Send response to frontend
      console.log(`Timestamp ${timestampInSeconds}: Challenge response is valid - Data:`, {
        session_id,
        nonce2,
        userData
      });

      res.status(200).json({
        message: "Challenge response is valid",
        session_id,
        nonce2,
        userData
      });
    } else {
      console.error(`Timestamp ${timestampInSeconds}: Invalid challenge response -`, req.body);
      res.status(400).json({ 
        timeStamp: timestampInSeconds,
        message: "Invalid challenge response" 
      });
    }
  } catch (e) {
    console.error(`Timestamp ${timestampInSeconds}: Error verifying challenge response -`, e, req.body);
    res.status(500).json({ 
      timeStamp: timestampInSeconds,
      error: "Internal server error",
      e
    });
  }
}
