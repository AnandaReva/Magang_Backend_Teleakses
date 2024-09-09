import pool from '../db/config';
import { Request } from "express";

export default async function validateRequestHash(req: Request): Promise<{ jobId: string } | "0"> {
    const timeStamp = new Date().toISOString();
    console.log('Executing method: validateRequestHash');
    
    try {
        const jobId = req.body?.job_id || '';
        console.log("Job ID received:", jobId);

        // Validate if job_id is present
        if (!jobId) {
            console.error(`[${timeStamp}] Missing field: job_id`);
            return "0";
        }

        const client = await pool.connect();
        try {
            // Query to compare job_id with the `id` field in `servobot2.session`
            const sessionQuery = 'SELECT id FROM servobot2.session WHERE id = $1 LIMIT 1';
            console.log(`Executing query: ${sessionQuery}`);
            const result = await client.query(sessionQuery, [jobId]);

            if (result.rowCount === 0) {
                console.error(`[${timeStamp}] Job ID [${jobId}] not found in servobot2.session table`);
                return "0";
            }

            console.log(`[${timeStamp}] Job ID [${jobId}] found in servobot2.session table`);

            return { jobId };
        } finally {
            client.release();
        }
    } catch (error) {
        console.error(`[${timeStamp}] Error while validating job_id:`, error);
        return "0";
    }
}
