import pool from '../db/config';

export default async function checkBotOwnership(botId: string, userId: string, organizationId: string): Promise<boolean> {
    const timeStamp = new Date().toISOString();
    console.log('Executing method: checkBotOwnership');

    const client = await pool.connect();

    try {
        
        const query = 'SELECT id, organization_id FROM servobot2.main_prompt WHERE id = $1 AND organization_id = $2';
        console.log("Query to find organization and owner: " + query);

        const result = await client.query(query, [botId, organizationId]);
        console.log(`Query result: ${JSON.stringify(result.rows)}`);

        if (result.rowCount === 0) {
            console.error(`[${timeStamp}] Bot with id = [${botId}], user ID = [${userId}], and organization ID = [${organizationId}] not found`);
            return false;
        }
        const row = result.rows[0];
        console.log(`Bot ID: ${botId}, Organization Column: ${row.organization_id}, Organization ID ID: ${row.organization_id}`);

        // Validasi apakah userId dan organizationId sesuai dengan data yang ditemukan
        if (organizationId !== row.organization_id) {
            console.error(`[${timeStamp}] Organization Id does not match: User ID [${userId}], Owner ID [${row.organization_id}], Organization Column [${row.correct_organization_column}]`);
            return false;
        }

        return true;
    } catch (error) {
        console.error(`[${timeStamp}] Error in checkBotOwnership:`, error);
        return false;
    } finally {
        client.release();
    }
}
