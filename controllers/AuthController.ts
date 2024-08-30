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


function calculateChallengeResponse(fullNonce: string, salted_password: string): string {
  console.log("Executing method: calculateChallengeResponse");
  console.log(`[Full Nonce: ${fullNonce}]`);
  console.log(`[Salted Password: ${salted_password}]`);

  // Calculate the challenge response using HMAC SHA256 hash
  const challengeResponse = createHMACSHA256Hash(fullNonce, salted_password);

  console.log("[Challenge Response: ", challengeResponse, "] \n ----------------");
  return challengeResponse;
}

// function createHMACSHA256Hash(data: string, secretKey: string): string {

//   console.log("execute method: createHMACSHA256Hash", "\n[data: " , data, "secretKey", secretKey , "]" )
//   const HMACSHA256Hash = crypto.createHmac('sha256', secretKey).update(data).digest('base64');
//   console.log("HMACSHA256Hash : ", HMACSHA256Hash)
//   return HMACSHA256Hash;
// }
// function calculateChallengeResponse(fullNonce: string, salted_password: string): string {
//   console.log("execute method: calculateChallengeResponse",  "\n[fullNonce: " , fullNonce ,  "salted_password: " , salted_password , "]");

//   const challenge_res = createHMACSHA256Hash(fullNonce, salted_password);
//   console.log("challenge_res = ", challenge_res);
//   return challenge_res;
// }



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
      console.error(`[${timestamp}] res.status(404).json: { timeStamp: "${timestamp}", message: "User not found", error: "User not registered in database" }`, { "username sent:": username });
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

    //verify challenge response

    // Find  challenge response in DB
    const challengeData = await prisma.challenge_response.findUnique({
      where: { full_nonce },
      include: { user: true },
    });

    if (!challengeData) {
      res.status(401).json({
        error: "Challenge not valid",
        message: "The challenge provided is not valid. Please ensure that the full_nonce is correct"
      });
      console.error(`[${timestamp}] res.status(401).json: { error: "Challenge not valid", message: "The challenge provided is not valid. Please ensure that the full_nonce is correct." }`, ` \nrequest sent: ${JSON.stringify(req.body)}`);
      return;
    }





    // Verify challenge response
    const expectedChallengeResponse = calculateChallengeResponse(full_nonce, challengeData.user.salted_password);
    const isValid = expectedChallengeResponse === challenge_response;
    console.log("expected Challenge Response: ", expectedChallengeResponse)
    console.log("compared challange rsponse: ", challenge_response, '\n -------------')
    if (isValid) {


      // generate session id - 16 random alphanumeric lowercase characters
      const session_id = generateRandomString(16);
      // generate nonce2 = 8 random alphanumeric lowercase characters
      const nonce2 = generateRandomString(8);
      // session secret = hmac-sha256(key=salted password, message = full nonce + nonce2
      const session_secret = createHMACSHA256Hash(`${full_nonce}${nonce2}`, challengeData.user.salted_password);
      
      console.log("challenge response valid");
      console.log("[  Valid Challenge Response: ", expectedChallengeResponse, ']')
      console.log(`Generate session ID and nonce2:`);
      console.log(`[  session_id: ${session_id} ]`);
      console.log(`[  nonce2: ${nonce2} ]`);
      console.log(`[  session_secret: ${session_secret}]`);

      await prisma.session.create({
        data: {
          session_id,
          user_id: challengeData.user_id,
          session_secret,
          tstamp: Math.floor(Date.now() / 1000),
          st: 1,
        },
      });

      const user_data = {
        user_id: challengeData.user.id.toString(),
        fullname: challengeData.user.fullname,
      };

      console.log(" Send response to frontend");

      res.status(200).json({
        session_id,
        nonce2,
        user_data
      });
      console.log(`[${timestamp}] status(200).json: Challenge response is valid:`, {
        session_id,
        nonce2,
        user_data
      });
    } else {
      res.status(400).json({
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
