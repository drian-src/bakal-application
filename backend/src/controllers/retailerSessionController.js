const retailerSessionRepository = require('../repositories/retailerSessionRepository');

/**
 * RetailerSessionController
 * Handles API endpoints for retailer session management
 */

class RetailerSessionController {
  /**
   * POST /api/retailer-sessions/create
   * Create a new retailer session
   */
  async createSession(req, res) {
    try {
      const { platformId } = req.body;
      const userId = req.user?.id;

      if (!userId || !platformId) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: userId, platformId',
        });
      }

      // Create session partition key
      const sessionPartition = `persist:${platformId}_${userId}`;

      const result = await retailerSessionRepository.createSession(
        userId,
        platformId,
        sessionPartition
      );

      if (!result.success) {
        return res.status(500).json(result);
      }

      res.json({
        success: true,
        data: result.data,
        message: 'Retailer session created successfully',
      });
    } catch (error) {
      console.error('Error in createSession:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * GET /api/retailer-sessions
   * Get all sessions for the current user
   */
  async getUserSessions(req, res) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
      }

      const result = await retailerSessionRepository.getSessionsByUser(userId);

      res.json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      console.error('Error in getUserSessions:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * GET /api/retailer-sessions/:platformId
   * Get session for specific platform
   */
  async getSessionByPlatform(req, res) {
    try {
      const { platformId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
      }

      const result = await retailerSessionRepository.getSessionByUserAndPlatform(
        userId,
        platformId
      );

      if (!result.success) {
        return res.status(500).json(result);
      }

      res.json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      console.error('Error in getSessionByPlatform:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * PATCH /api/retailer-sessions/:sessionId
   * Update session (mark as accessed)
   */
  async updateSession(req, res) {
    try {
      const { sessionId } = req.params;
      const userId = req.user?.id;

      if (!userId || !sessionId) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
        });
      }

      const result = await retailerSessionRepository.updateLastAccessed(
        sessionId
      );

      if (!result.success) {
        return res.status(500).json(result);
      }

      res.json({
        success: true,
        data: result.data,
        message: 'Session updated',
      });
    } catch (error) {
      console.error('Error in updateSession:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * DELETE /api/retailer-sessions/:sessionId
   * Deactivate/delete a retailer session (logout)
   */
  async deleteSession(req, res) {
    try {
      const { sessionId } = req.params;
      const userId = req.user?.id;

      if (!userId || !sessionId) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
        });
      }

      const result = await retailerSessionRepository.deactivateSession(
        sessionId
      );

      if (!result.success) {
        return res.status(500).json(result);
      }

      res.json({
        success: true,
        message: 'Session deleted successfully',
      });
    } catch (error) {
      console.error('Error in deleteSession:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * DELETE /api/retailer-sessions
   * Delete all sessions for user (logout from all retailers)
   */
  async deleteAllUserSessions(req, res) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
      }

      const result = await retailerSessionRepository.deleteUserSessions(userId);

      if (!result.success) {
        return res.status(500).json(result);
      }

      res.json({
        success: true,
        message: 'All sessions deleted successfully',
      });
    } catch (error) {
      console.error('Error in deleteAllUserSessions:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * GET /api/retailer-sessions/:platformId/status
   * Check if session is active
   */
  async checkSessionStatus(req, res) {
    try {
      const { platformId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
      }

      const result = await retailerSessionRepository.isSessionActive(
        userId,
        platformId
      );

      if (!result.success) {
        return res.status(500).json(result);
      }

      res.json({
        success: true,
        isActive: result.isActive,
      });
    } catch (error) {
      console.error('Error in checkSessionStatus:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
}

module.exports = new RetailerSessionController();
