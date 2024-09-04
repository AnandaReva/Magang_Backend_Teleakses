import pool from '../db/config';

export default async function checkBotOwnership(botId: string, userId: string): Promise<boolean> {
    const timeStamp = new Date().toISOString();
    console.log('Executing method: checkBotOwnership');

    const client = await pool.connect();

    try {
        // Query untuk memeriksa apakah botId ada di database dan mendapatkan owner_id
        const query = 'SELECT owner_id FROM servobot2.main_prompt WHERE id = $1 LIMIT 1';
        console.log("Query to find owner: " + query);

        const result = await client.query(query, [botId]);

        // Jika botId tidak ditemukan di database
        if (result.rowCount === 0) {
            console.error(`[${timeStamp}] Bot with id = [${botId}] not found`);
            return false;
        }

        // Ambil owner_id dari hasil query
        const ownerId = result.rows[0].owner_id;
        console.log(`Bot ID: ${botId}, Owner ID: ${ownerId}, User ID: ${userId}`);

        // Periksa apakah ownerId cocok dengan userId yang diberikan
        if (userId !== ownerId.toString()) {
            console.error(`[${timeStamp}] User ID [${userId}] does not match Owner ID [${ownerId}]`);
            return false;
        }

        // Jika semua pengecekan berhasil, return true
        return true;
    } catch (error) {
        console.error(`[${timeStamp}] Error in checkBotOwnership:`, error);
        return false;
    } finally {
        client.release();
    }
}
