import pool from '../db/config'; // Pastikan path ke konfigurasi database benar

// Fungsi untuk memeriksa apakah botId milik owner_id yang sama
export default async function checkBotOwnership(botId: string): Promise<boolean> {
    const timeStamp = new Date().toISOString();
    console.log('Executing method: checkBotOwnership');
    const client = await pool.connect();

    try {
        // Query untuk mendapatkan owner_id berdasarkan botId
        const query = 'SELECT owner_id FROM servobot2.main_prompt WHERE id = $1';
        const result = await client.query(query, [botId]);

        if (result.rowCount === 0) {
            console.error(`[${timeStamp}] Bot with id = [${botId}] not found`);
            return false;
        }

        const ownerId = result.rows[0].owner_id;
        console.log(`Bot ID: ${botId}, Owner ID: ${ownerId}`);

        // Periksa apakah botId sama dengan owner_id
        return botId === ownerId.toString();
    } catch (error) {
        console.error(`[${timeStamp}] Error in checkBotOwnership:`, error);
        return false;
    } finally {
        client.release();
    }
}
