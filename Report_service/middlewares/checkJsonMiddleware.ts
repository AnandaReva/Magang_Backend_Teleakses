import { Request, Response, NextFunction } from 'express';
import generateTimestamp from '../utils/generateTimeStamp';

export default function checkJsonMiddleware(err: any, req: Request, res: Response, next: NextFunction) {
    const timeStamp = generateTimestamp();
    console.log("execute middleware checkJsonMiddleware");
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    console.log('\n', '------------------------------------------');
    console.log(`[${timeStamp}] Incoming request from IP: ${ipAddress}`);
    console.log(`Request details: curl -X ${req.method} ${req.url} \\
    -H "Content-Type: ${req.headers['content-type']}" \\
    -H "Authorization: ${req.headers['authorization'] || 'N/A'}" \\
    -d '${JSON.stringify(req.body)}'`);

    // Check for JSON syntax error
    if (err instanceof SyntaxError && (
        err.message.match(/Unexpected token/) ||
        err.message.match(/SyntaxError/) ||
        err.message.match(/Expected/)
    )) {
        console.error(`JSON Parsing error: ${err.message}`);
        console.log(
            `res.status(400).json:`, {
            error_message: "invalid request. Not JSON",
            error_code: "40000000",
        });
        return res.status(400).json({
            error_message: "invalid request. Not JSON",
            error_code: "40000000",
        });
    }
    next(err);
};
