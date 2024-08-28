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
//   "full_nonce": "932eweqfwt2b92ax",
//   "challenge_response": "m3Phj39TE319WbJtcFyu2wA/xKnXvh9Gbhe6a919LVk="
// }


router.post('/verify-challenge', handleChallengeResponseVerification);

export default router;
