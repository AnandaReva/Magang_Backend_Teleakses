// utils/checkBotOrganization.ts
import pool from '../db/config';
import log from './logHelper';
import { globalVar } from './globalVar';

export default async function checkBotOrganization(botId: string, userId: string, organizationId: string): Promise<boolean> {
    let referenceId = globalVar.getReferenceId() || 'undefined';

    log(referenceId, '\nExecuting method: checkBotOrganization');

    const query = 'SELECT id, organization_id FROM servobot2.main_prompt WHERE id = $1 AND organization_id = $2';
    log(referenceId, "Query to find bot id and organization:", query);

    const client = await pool.connect();

    try {
        const result = await client.query(query, [botId, organizationId]);
        log(referenceId, `Query result:`, result.rows);

        if (result.rowCount === 0) {
            log(referenceId, `Bot with id = [${botId}], user ID = [${userId}], and organization ID = [${organizationId}] not found`);
            return false;
        }
        const row = result.rows[0];
        log(referenceId, `Bot ID: ${botId}, Organization Column: ${row.organization_id}, Organization ID: ${row.organization_id}`);

        if (organizationId !== row.organization_id) {
            log(referenceId, `Organization Id does not match: User ID [${userId}], organization id [${row.organization_id}]`);
            return false;
        }
        return true;
    } catch (error) {
        log(referenceId, `Error in checkBotOrganization:`, error);
        return false;
    } finally {
        client.release();
    }
}
