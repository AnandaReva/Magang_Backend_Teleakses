import pool from '../db/config';
import generateTimestamp from './generateTimeStamp';

export default async function checkBotOrganization(botId: string, userId: string, organizationId: string): Promise<boolean> {
    const timeStamp = generateTimestamp;
    console.log('Executing method: checkBotOrganization');

    try {
        const query = 'SELECT id, organization_id FROM servobot2.main_prompt WHERE id = $1 AND organization_id = $2';
        console.log("Query to find bot id and organization: " + query);
        const result = await pool.query(query, [botId, organizationId]);
        console.log(`Query result: ${JSON.stringify(result.rows)}`);

        if (result.rowCount === 0) {
            console.error(`[${timeStamp}] Bot with id = [${botId}], user ID = [${userId}], and organization ID = [${organizationId}] not found`);
            return false;
        }
        const row = result.rows[0];
        console.log(`Bot ID: ${botId}, Organization Column: ${row.organization_id}, Organization ID ID: ${row.organization_id}`);

        if (organizationId !== row.organization_id) {
            console.error(`[${timeStamp}] Organization Id does not match: User ID [${userId}], organization id ID [${row.organization_id}]`);
            return false;
        }
        return true;
    } catch (error) {
        console.error(`[${timeStamp}] Error in checkBotOrganization:`, error);
        return false;
    }
}
