import pool from '../db/config';

export default async function checkBotOwnership(botId: string, userId: string): Promise<boolean> {
    const timeStamp = new Date().toISOString();
    console.log('Executing method: checkBotOwnership');

    const client = await pool.connect();

    try {
        // Query 1: Memeriksa apakah botId ada di database dan mendapatkan owner_id
        const query1 = 'SELECT owner_id FROM servobot2.main_prompt WHERE id = $1';
        console.log("Query1 to find owner: " + query1);

        const result1 = await client.query(query1, [botId]);

        // Jika botId tidak ditemukan di database
        if (result1.rowCount === 0) {
            console.error(`[${timeStamp}] Bot with id = [${botId}] not found`);
            return false;
        }

        // Ambil owner_id dari hasil query
        const ownerId = result1.rows[0].owner_id;
        console.log(`Bot ID: ${botId}, Owner ID: ${ownerId}, User ID: ${userId}`);

        // Query 2: Memeriksa apakah botId valid berdasarkan ID yang ada
        const query2 = 'SELECT id FROM servobot2.main_prompt WHERE id = $1';
        console.log("Query2 to validate botId: " + query2);

        const result2 = await client.query(query2, [botId]);

        // Jika botId tidak valid
        if (result2.rowCount === 0) {
            console.error(`[${timeStamp}] Bot with id = [${botId}] is not valid`);
            return false;
        }

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
