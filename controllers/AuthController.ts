import { Request, Response } from "express";
import { PrismaClient, User } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

// exp req body
//{
//     "username":"testuser",
//     "half_nonce":"932eweqf"
//     }
// generate random alphanumeric string
function generateRandomString(length: number): string {
  //func dari WA
  const charset = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    result += charset[randomIndex];
  }
  return result;
}

export async function handleLoginRequest(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { username, half_nonce } = req.body;

    console.log(req.body);

    //validasi
    if (!username || !half_nonce) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }
    const user = await prisma.user.findUnique({
      //
      where: { username },
      select: { id: true, salt: true, saltedPassword: true },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Genrt nonce1
    const nonce1 = generateRandomString(8);
    const fullNonce = `${half_nonce}${nonce1}`;

    // Generate challenge_response
    const challengeResponse = crypto
      .createHmac("sha256", user.saltedPassword)
      .update(fullNonce)
      .digest("base64");

    // Save challenge_response to DB
    await prisma.challengeResponse.create({
      data: {
        fullNonce,
        userId: user.id,
        challengeResponse,
      },
    });

    // Send response to frontend
    res.json({
      full_nonce: fullNonce,
      challenge_response: challengeResponse,
    });
  } catch (e) {
    console.error("Error handling login request:", e, req.body );
    res.status(500).json({ message:"Internal server error:" , e , reqBody: req.body });

  }
}

// export async function handleChallengeResponseVerification(
//   req: Request,
//   res: Response
// ): Promise<void> {
//   try {
//     const { full_nonce, challenge_response } = req.body;

//     //debug
//     console.log(req.body);

//     if (!full_nonce || !challenge_response) {
//       res.status(400).json({ error: "Invalid input" });
//       return;
//     }

//     // Find the challenge response on DB
//     const challenge = await prisma.challengeResponse.findUnique({
//       where: { fullNonce: full_nonce },
//       include: { user: true }, // Include user relationship
//     });

//     if (!challenge) {
//       res.status(401).json({ error: "Challenge not valid" });
//       return;
//     }

//     // Verify  challenge res
//     const isValid =
//       crypto
//         .createHmac("sha256", challenge.user.saltedPassword)
//         .update(full_nonce)
//         .digest("base64") === challenge_response;

//     if (isValid) {
//       // Generate session ID dan nonce2
//       const sessionId = generateRandomString(16);
//       const nonce2 = generateRandomString(8);
//       const sessionSecret = crypto
//         .createHmac("sha256", challenge.user.saltedPassword)
//         .update(`${full_nonce}${nonce2}`)
//         .digest("base64");

   
//       const timestamp = Math.floor(Date.now() / 1000); // Timestamp in secons

//       //if challenge response valid:
//       // generate session id - 16 random alphanumeric lowercase characters
//       // generate nonce2 = 8 random alphanumeric lowercase characters
//       // session secret = hmac-sha256(key=salted password, message = full nonce + nonce2

//       //save session id, session secret, user id, tstamp to Session db

//       // save Session db
//       const newSession = await prisma.session.create({
//         data: {
//           sessionId,
//           userId: challenge.userId,
//           sessionSecret,
//           tstamp: timestamp,
//           st: 1, // Asumsi status 1 untuk session yang aktif
//         },
//       });
      
//       // Tampilkan data session yang baru saja disimpan
//       console.log(newSession);
    
//       res.status(200).json({
//         message: "Challenge response is valid",
//         sessionId,
//         nonce2,
//         userData;
//       });

   

//     } else {
//       res.status(400).json({ message: "Invalid challenge response" });
//     }
//   } catch (error) {
//     console.error("Error verifying challenge response:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// }

export async function handleChallengeResponseVerification(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { full_nonce, challenge_response } = req.body;

    // Debugging
    console.log(req.body);

    if (!full_nonce || !challenge_response) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }

    // Find the challenge response on DB
    const challenge = await prisma.challengeResponse.findUnique({
      where: { fullNonce: full_nonce },
      include: { user: true }, // Include user relationship
    });

    if (!challenge) {
      res.status(401).json({ error: "Challenge not valid" });
      return;
    }

    // Verify challenge response
    const isValid =
      crypto
        .createHmac("sha256", challenge.user.saltedPassword)
        .update(full_nonce)
        .digest("base64") === challenge_response;

    if (isValid) {
      // Gnrt session ID and nonce2
      const sessionId = generateRandomString(16);
      const nonce2 = generateRandomString(8);
      const sessionSecret = crypto
        .createHmac("sha256", challenge.user.saltedPassword)
        .update(`${full_nonce}${nonce2}`)
        .digest("base64");

      const timestamp = Math.floor(Date.now() / 1000); // Timestamp in seconds

      // Save Session to DB
      const newSession = await prisma.session.create({
        data: {
          sessionId,
          userId: challenge.userId,
          sessionSecret,
          tstamp: timestamp,
          st: 1, 
        },
      });


      const userData = {
        id: challenge.user.id.toString(), // Convert BigInt to string
        username: challenge.user.username,
        salt: challenge.user.salt,
        saltedPassword : challenge.user.saltedPassword
      };

      // Send response to frontend
      res.status(200).json({
        message: "Challenge response is valid",
        sessionId,
        nonce2,
        userData, 
      });

    } else {
      console.error("Invalid challenge response", req.body );
      res.status(400).json({ message: "Invalid challenge response", reqBody: req.body });

    }
  } catch (e) {
    console.error("Error verifying challenge response:", e, req.body );
    res.status(500).json({ error: "Internal server error" , e , reqBody: req.body });
  }
}
