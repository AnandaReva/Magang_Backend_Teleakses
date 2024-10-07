import { Request, Response, NextFunction } from 'express';
import { globalVar } from '../utils/globalVar';
import generateRandomString from '../utils/generateRandomString';
import log from '../utils/logHelper';

export default function checkJsonMiddleware(err: any, req: Request, res: Response, next: NextFunction) {
    // Generate a unique reference ID for logging
    const referenceId = generateRandomString(6);
    globalVar.setReferenceId(referenceId);

    // Extract request details
    const { method, url, headers, body } = req;
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    // Log incoming request details
    log(referenceId, "\nExecuting middleware: checkJsonMiddleware");
    log(referenceId, `Incoming request from IP: ${ipAddress}`);
    log(referenceId, `Request details: curl -X ${method} ${url} \\`);
    log(referenceId, `-H "Content-Type: ${headers['content-type']}" \\`);
    log(referenceId, `-H "Authorization: ${headers['authorization'] || 'N/A'}" \\`);
    log(referenceId, `-d '${JSON.stringify(body)}'`);

    // Check for JSON syntax errors
    if (err instanceof SyntaxError && (
        err.message.match(/Unexpected token/) ||
        err.message.match(/SyntaxError/) ||
        err.message.match(/Expected/)
    )) {
        log(referenceId, `JSON Parsing error: ${err.message}`);
        log(referenceId, `res.status(400).json:`, {
            error_message: "invalid request. Not JSON",
            error_code: "40000001",
        });
        return res.status(400).json({
            error_message: "invalid request. Not JSON",
            error_code: "40000001",
        });
    }

    // Continue to the next middleware or route handler
    next(err);
};
