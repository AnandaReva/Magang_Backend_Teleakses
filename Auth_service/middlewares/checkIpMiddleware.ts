import { Request, Response, NextFunction } from "express";

const checkIpMiddleware = function (req: Request, res: Response, next: NextFunction) {
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress
    console.log('\n','------------------------------------------');
    console.log(`[${new Date().toISOString()}] Incoming request from IP: ${ipAddress}`);
    next();
}
export default checkIpMiddleware;