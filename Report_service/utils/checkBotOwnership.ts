import pool from '../db/config';

export default async function checkBotOwnership(botId: string, userId: string): Promise<boolean> {
    const timeStamp = new Date().toISOString();
    console.log('Executing method: checkBotOwnership');

    const client = await pool.connect();

    try {
        // Query untuk memilih id dan owner_id
        const query = 'SELECT id, owner_id FROM servobot2.main_prompt WHERE id = $1 AND owner_id = $2';
        console.log("Query to find owner: " + query);

        // Jalankan query dengan parameter botId dan userId
        const result = await client.query(query, [botId, userId]);

        // Log hasil query dengan detail
        console.log(`Query result: ${JSON.stringify(result.rows)}`);

        if (result.rowCount === 0) {
            console.error(`[${timeStamp}] Bot with id = [${botId}] and user ID = [${userId}] not found`);
            return false;
        }

        // Mengambil owner_id dari hasil query
        const row = result.rows[0];
        const ownerId = row.owner_id;
        console.log(`Bot ID: ${botId}, Owner ID: ${ownerId}, User ID: ${userId}`);

        // Verifikasi apakah ownerId cocok dengan userId yang diberikan
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
