import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();


// exp req body 
//{
//     "username":"testuser",
//     "half_nonce":"932eweqf"
//     }
// generate random alphanumeric string
function generateRandomString(length: number): string { //func dari WA
  const charset = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    result += charset[randomIndex];
  }
  return result;
}

export async function handleLoginRequest(req: Request, res: Response): Promise<void> {
  try {
    const { username, half_nonce } = req.body;

    console.log(req.body)

    //validasi
    if (!username || !half_nonce) {
      res.status(400).json({ error: 'Invalid input' });
      return;
    }
    const user = await prisma.user.findUnique({ //
      where: { username },
      select: { id: true, salt: true, saltedPassword: true }
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Genrt nonce1
    const nonce1 = generateRandomString(8);
    const fullNonce = `${half_nonce}${nonce1}`;

    // Generate challenge_response
    const challengeResponse = crypto.createHmac('sha256', user.saltedPassword)
                                    .update(fullNonce)
                                    .digest('base64');

    // Save challenge_response to DB
    await prisma.challengeResponse.create({
      data: {
        fullNonce,
        userId: user.id,
        challengeResponse
      }
    });

    // Send response to frontend
    res.json({
      full_nonce: fullNonce,
      challenge_response: challengeResponse
    });

  } catch (error) {
    console.error('Error handling login request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function handleChallengeResponseVerification(req: Request, res: Response): Promise<void> {
    try {
      const { full_nonce, challenge_response } = req.body;

      //debug
      console.log(req.body)
  
      if (!full_nonce || !challenge_response) {
        res.status(400).json({ error: 'Invalid input' });
        return;
      }
  
      // Find the challenge response on DB
      const challenge = await prisma.challengeResponse.findUnique({
        where: { fullNonce: full_nonce },
        include: { user: true } // Include user relationship
      });
  
      if (!challenge) {
        res.status(404).json({ error: 'Challenge not found' });
        return;
      }
  
      // Verify  challenge res
      const isValid = crypto.createHmac('sha256', challenge.user.saltedPassword)
                            .update(full_nonce)
                            .digest('base64') === challenge_response;
  
      if (isValid) {
        res.status(200).json({ message: 'Challenge response is valid' });
      } else {
        res.status(400).json({ message: 'Invalid challenge response' });
      }
  
    } catch (error) {
      console.error('Error verifying challenge response:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  
