// js/db.js - Database helpers using Supabase
// Self-contained classic script (no ES module imports)
// Supabase UMD must be loaded before this script via:
//   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>

(function() {
    var SUPABASE_URL = 'https://npnpaimawwdxqlcvbfur.supabase.co';
    var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wbnBhaW1hd3dkeHFsY3ZiZnVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNzcxNTMsImV4cCI6MjA5MDg1MzE1M30.oTUKF7oXJAiyuQfxl5qUJQci1baGxRpEu3cZaO8GAhY';

    var _supabase = null;
    function getSupabaseClient() {
        if (_supabase) return _supabase;
        if (window.supabase && window.supabase.createClient) {
            _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            return _supabase;
        }
        console.warn('Supabase UMD not loaded yet');
        return null;
    }

    /**
     * Save a completed session to the database.
     */
    window.saveSessionToDb = async function saveSessionToDb(sessionData) {
        try {
            var client = getSupabaseClient();
            if (!client) {
                console.warn('Supabase client not available - skipping session save');
                return null;
            }
            var sessionResult = await client.auth.getSession();
            var session = sessionResult.data && sessionResult.data.session;
            var userId = (session && session.user && session.user.id) || localStorage.getItem('userId');
            if (!userId || userId.startsWith('guest_')) {
                console.log('Guest user - skipping session save');
                return null;
            }
            var record = Object.assign({}, sessionData, { user_id: userId });
            var result = await client
                .from('sessions')
                .insert([record])
                .select();
            if (result.error) {
                console.error('Failed to save session:', result.error);
                return null;
            }
            console.log('Session saved to database:', result.data);
            return result.data;
        } catch (error) {
            console.error('Error saving session to database:', error);
            return null;
        }
    };

    /**
     * Fetch the last N sessions for a user, ordered by created_at descending.
     */
    window.fetchRecentSessions = async function fetchRecentSessions(userId, limit) {
        limit = limit || 3;
        try {
            var client = getSupabaseClient();
            if (!client) {
                console.warn('Supabase client not available - returning empty sessions');
                return [];
            }
            var result = await client
                .from('sessions')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(limit);
            if (result.error) {
                console.error('Failed to fetch sessions:', result.error);
                return [];
            }
            console.log('Fetched sessions from database:', result.data);
            // Reverse so oldest is first (for left-to-right display)
            return (result.data || []).reverse();
        } catch (error) {
            console.error('Error fetching sessions from database:', error);
            return [];
        }
    };
})();
