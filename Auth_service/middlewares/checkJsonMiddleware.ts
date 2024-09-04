import { Request, Response, NextFunction } from 'express';
import generateTimestamp from '../utils/generateTimeStamp';

const checkJsonMiddleware = (err: any, req: Request, res: Response, next: NextFunction) => {
    console.log("execute middleware checkJsonMiddleware")
    if (err instanceof SyntaxError &&
        (err.message.includes('Unexpected token') ||
            err.message.includes('SyntaxError') ||
            err.message.includes('Expected'))) {
        const timeStamp = generateTimestamp();
        console.error(`[${timeStamp}] Parsing error:`, err.message);

        return res.status(400).json({
            error_code: `Invalid JSON format]`,

        });
    }
    next(err);
};

export default checkJsonMiddleware;
