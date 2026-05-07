const { supabase } = require('../config/db');

/**
 * RetailerSessionRepository
 * Handles all database operations for linked_retailer_sessions table
 */

class RetailerSessionRepository {
  /**
   * Create a new retailer session
   */
  async createSession(userId, platformId, sessionPartition) {
    try {
      const { data, error } = await supabase
        .from('linked_retailer_sessions')
        .insert([
          {
            user_id: userId,
            platform_id: platformId,
            session_partition: sessionPartition,
            is_active: true,
            login_time: new Date().toISOString(),
            last_accessed: new Date().toISOString(),
          },
        ])
        .select('*');

      if (error) throw error;

      return {
        success: true,
        data: data[0],
      };
    } catch (error) {
      console.error('Error creating retailer session:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get session by user and platform
   */
  async getSessionByUserAndPlatform(userId, platformId) {
    try {
      const { data, error } = await supabase
        .from('linked_retailer_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('platform_id', platformId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      return {
        success: true,
        data: data || null,
      };
    } catch (error) {
      console.error('Error getting retailer session:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get all sessions for a user
   */
  async getSessionsByUser(userId) {
    try {
      const { data, error } = await supabase
        .from('linked_retailer_sessions')
        .select('*, platforms(name)')
        .eq('user_id', userId)
        .order('last_accessed', { ascending: false });

      if (error) throw error;

      return {
        success: true,
        data: data || [],
      };
    } catch (error) {
      console.error('Error getting user retailer sessions:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Update session last accessed time
   */
  async updateLastAccessed(sessionId) {
    try {
      const { data, error } = await supabase
        .from('linked_retailer_sessions')
        .update({
          last_accessed: new Date().toISOString(),
          is_active: true,  // Ensure session is active when accessed
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId)
        .select('*');

      if (error) throw error;

      return {
        success: true,
        data: data[0],
      };
    } catch (error) {
      console.error('Error updating session last accessed:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Deactivate session (logout)
   */
  async deactivateSession(sessionId) {
    try {
      const { data, error } = await supabase
        .from('linked_retailer_sessions')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId)
        .select('*');

      if (error) throw error;

      return {
        success: true,
        data: data[0],
      };
    } catch (error) {
      console.error('Error deactivating session:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId) {
    try {
      const { error } = await supabase
        .from('linked_retailer_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error deleting session:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Delete all sessions for a user (logout from all retailers)
   */
  async deleteUserSessions(userId) {
    try {
      const { error } = await supabase
        .from('linked_retailer_sessions')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error deleting user sessions:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Check if session exists and is active
   */
  async isSessionActive(userId, platformId) {
    try {
      const { data, error } = await supabase
        .from('linked_retailer_sessions')
        .select('is_active')
        .eq('user_id', userId)
        .eq('platform_id', platformId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      return {
        success: true,
        isActive: data?.is_active || false,
      };
    } catch (error) {
      console.error('Error checking session active status:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get platform UUID by platform name/id
   */
  async getPlatformUUID(platformName) {
    try {
      const { data, error } = await supabase
        .from('platforms')
        .select('id')
        .ilike('name', platformName)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      return {
        success: true,
        data: data?.id || null,
      };
    } catch (error) {
      console.error('Error getting platform UUID:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = new RetailerSessionRepository();
