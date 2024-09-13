import { Request, Response, NextFunction } from 'express';
import { globalVar } from '../utils/globalVar';

import generateRandomString from '../utils/generateRandomString';
import log from '../utils/logHelper';

// Generate a unique reference ID for each request

const logRequestMiddleware = (req: Request, res: Response, next: NextFunction) => {
    let referenceId = generateRandomString(6); 

    globalVar.setReferenceId(referenceId);

    const { method, url, headers, body } = req;
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    console.log("\n-----------------------------------------")
    log(globalVar.getReferenceId(), 'INCOMING REQUEST FROM IP ADDRESS:', ipAddress);
    log(globalVar.getReferenceId(), `Received ${method} request to url: ${url}`);
    log(globalVar.getReferenceId(), 'Headers:', headers);

    if (headers['content-type'] === 'application/json') {
        log(globalVar.getReferenceId(), 'Body (JSON):', body);
    } else if (headers['content-type'] === 'application/x-www-form-urlencoded') {
        log(globalVar.getReferenceId(), 'Body (URL Encoded):', body);
    } else {
        log(globalVar.getReferenceId(), 'Body (Other):', body);
    }

    next();
};

export default logRequestMiddleware;
