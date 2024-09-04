import pool from '../db/config'; // Pastikan path ke konfigurasi database benar


export default async function checkBotOwnership(botId: string, userId: string): Promise<boolean> {
    const timeStamp = new Date().toISOString();
    console.log('Executing method: checkBotOwnership');
    const client = await pool.connect();

    try {
        
        const query = 'SELECT owner_id FROM servobot2.main_prompt WHERE id = $1';

        console.log("Qeury find woner: " + query);
        const result = await client.query(query, [botId]);

        if (result.rowCount === 0) {
            console.error(`[${timeStamp}] Bot with id = [${botId}] not found`);
            return false;
        }

        const ownerId = result.rows[0].owner_id;
        console.log(`Bot ID: ${botId}, Owner ID: ${ownerId}, User ID: ${userId}`);

        if (userId !== ownerId.toString()) {
            console.error(`[${timeStamp}] User ID [${userId}] does not match Owner ID [${ownerId}]`);
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
