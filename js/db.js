// js/db.js - Database helpers using Supabase (replaces InsForge DB)
import supabase from './supabase.js';

/**
 * Save a completed session to the database.
 */
async function saveSessionToDb(sessionData) {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id || localStorage.getItem('userId');
        if (!userId || userId.startsWith('guest_')) {
            console.log('Guest user - skipping session save');
            return null;
        }
        const record = { ...sessionData, user_id: userId };
        const { data, error } = await supabase
            .from('sessions')
            .insert([record])
            .select();
        if (error) {
            console.error('Failed to save session:', error);
            return null;
        }
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
        const { data, error } = await supabase
            .from('sessions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);
        if (error) {
            console.error('Failed to fetch sessions:', error);
            return [];
        }
        console.log('Fetched sessions from database:', data);
        // Reverse so oldest is first (for left-to-right display)
        return (data || []).reverse();
    } catch (error) {
        console.error('Error fetching sessions from database:', error);
        return [];
    }
}
