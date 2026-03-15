import db from './db.js';

const SESSION_TTL_HOURS = 720; // 30 días

/**
 * Returns the full message history for a session.
 * Returns [] if the session doesn't exist or has expired (> 24h without activity).
 */
export const getHistory = async (sessionId) => {
    try {
        const row = db.prepare('SELECT history, updated_at FROM conversations WHERE session_id = ?').get(sessionId);

        if (!row) return [];

        const { history, updated_at } = row;
        const hoursSinceUpdate = (Date.now() - new Date(updated_at).getTime()) / (1000 * 60 * 60);

        if (hoursSinceUpdate > SESSION_TTL_HOURS) {
            // Session expired — clear it
            db.prepare('DELETE FROM conversations WHERE session_id = ?').run(sessionId);
            console.log(`🗑️  Session expired and cleared: ${sessionId}`);
            return [];
        }

        return JSON.parse(history) || [];
    } catch (error) {
        console.error('Error reading conversation history:', error.message);
        return [];
    }
};

/**
 * Saves / updates the history for a session. Resets the 24h TTL.
 */
export const saveHistory = async (sessionId, history) => {
    try {
        db.prepare(`
            INSERT INTO conversations (session_id, history, updated_at)
            VALUES (@session_id, @history, datetime('now'))
            ON CONFLICT (session_id)
            DO UPDATE SET history = @history, updated_at = datetime('now')
        `).run({
            session_id: sessionId,
            history: JSON.stringify(history)
        });
    } catch (error) {
        console.error('Error saving conversation history:', error.message);
    }
};
