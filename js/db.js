// js/db.js - InsForge Database helpers (plain JS, no modules)
const INSFORGE_DB_URL = 'https://dku2r8qi.us-east.insforge.app/api/database/records';
const INSFORGE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTU2NzgtOTBhYi1jZGVmMTIzNDU2NzgiLCJlbWFpbCI6ImFub25AaW5zZm9yZ2UuY29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0OTkzNjV9.q_gq6R8PIMy4UH0X50Ks4JoZIQi50mUWR5-aINeIpro';

function getDbHeaders() {
    return {
        'Authorization': 'Bearer ' + INSFORGE_ANON_KEY,
        'Content-Type': 'application/json'
    };
}

/**
 * Save a completed session to the database.
 */
async function saveSessionToDb(sessionData) {
    try {
        const response = await fetch(INSFORGE_DB_URL + '/sessions', {
            method: 'POST',
            headers: {
                ...getDbHeaders(),
                'Prefer': 'return=representation'
            },
            body: JSON.stringify([sessionData])
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('Failed to save session:', response.status, errText);
            return null;
        }

        const data = await response.json();
        console.log('Session saved to database:', data);
        return data;
    } catch (error) {
        console.error('Error saving session to database:', error);
        return null;
    }
}

/**
 * Fetch the last N sessions for a user, ordered by created_at descending.
 */
async function fetchRecentSessions(userId, limit) {
    limit = limit || 3;
    try {
        const params = new URLSearchParams({
            user_id: 'eq.' + userId,
            order: 'created_at.desc',
            limit: limit.toString()
        });

        const response = await fetch(INSFORGE_DB_URL + '/sessions?' + params.toString(), {
            method: 'GET',
            headers: getDbHeaders()
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('Failed to fetch sessions:', response.status, errText);
            return [];
        }

        const data = await response.json();
        console.log('Fetched sessions from database:', data);
        // Reverse so oldest is first (for left-to-right display)
        return data.reverse();
    } catch (error) {
        console.error('Error fetching sessions from database:', error);
        return [];
    }
}
