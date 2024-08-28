//routes/AuthRoutes.ts
import { Router } from 'express';
import { handleLoginRequest, handleChallengeResponseVerification } from '../controllers/AuthController';

const router = Router();


// exp req body 
//{
//     "username":"testuser",
//     "half_nonce":"932eweqf"
//     }
router.post('/login', handleLoginRequest);



// {
//   "full_nonce": "nonce_12345678",
//   "challenge_response": "challenge_response_value"
// }


router.post('/verify-challenge', handleChallengeResponseVerification);

export default router;
