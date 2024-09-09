import { Request, Response, NextFunction } from 'express';
import generateTimestamp from '../utils/generateTimeStamp';


const logRequestMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const timestamp = generateTimestamp();
    const { method, url, headers, body } = req;
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    console.log('\n', '------------------------------------------');
    console.log(`[${timestamp}] Incoming request from IP: ${ipAddress}`);
    console.log(`Received ${method} request to url: ${url}`);
    console.log('Headers:', headers);
    if (headers['content-type'] === 'application/json') {
        console.log('Body (JSON):', body);
    } else if (headers['content-type'] === 'application/x-www-form-urlencoded') {
        console.log('Body (URL Encoded):', body);
    } else {
        console.log('Body (Other):', body);
    }
    console.log( '------------------------------------------');

    next();
};

export default logRequestMiddleware;
