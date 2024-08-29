import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

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

// Handle login request: generate and save challenge
export async function handleLoginRequest(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { username, half_nonce } = req.body;

    console.log(req.body);

  // Validate each field and determine which ones are missing
  const missingFields = [];
  if (!username) missingFields.push('username');
  if (!half_nonce) missingFields.push('half_nonce');

  if (missingFields.length > 0) {
    console.log('Missing fields:', missingFields);
    res.status(400).json({ 
      error: "Invalid input", 
      missingFields 
    });
    
    return;
  }
    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true, salt: true },
    });

    if (!user) {
      res.status(404).json({ message: "User not found" , error: "User not registered in database"});
      console.log("User not found, User not registered in database, ensure username exists in database");
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
  } catch (e) {
    console.error("Error handling login request:", e, req.body);
    res.status(500).json({ message: "Internal server error" });
  }
}

// Handle challenge response verification
export async function handleChallengeResponseVerification(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { full_nonce, challenge_response } = req.body;

    console.log(req.body);

    if (!full_nonce || !challenge_response) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }

    // Find the challenge response in DB
    const challenge = await prisma.challenge_response.findUnique({
      where: { full_nonce },
      include: { user: true }, // Include user relationship
    });

    if (!challenge) {
      res.status(401).json({ message: "Challenge not valid"  });
      console.log("Challenge not valid")
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

      const timestamp = Math.floor(Date.now() / 1000); // Timestamp in seconds

      // Save Session to DB
      await prisma.session.create({
        data: {
          session_id,
          user_id: challenge.user_id,
          session_secret,
          tstamp: timestamp,
          st: 1,
        },
      });

      const userData = {
        id: challenge.user.id.toString(), // Convert BigInt to string
        fullname: challenge.user.fullname

      };

      // Send response to frontend
      res.status(200).json({
        message: "Challenge response is valid",
        session_id,
        nonce2,
        userData,
      });
    } else {
      console.error("Invalid challenge response", req.body);
      res.status(400).json({ message: "Invalid challenge response" });
    }
  } catch (e) {
    console.error("Error verifying challenge response:", e, req.body);
    res.status(500).json({ error: "Internal server error" });
  }
}
