'use strict';

const { supabase } = require('../config/db');
const logger = require('../config/logger');

/**
 * Job Queue Repository
 * Manages background job persistence and retrieval
 */

class JobQueue {
  /**
   * Enqueue a new job
   */
  async enqueue(jobData) {
    const { job_type, query_text, product_id, priority = 5, data = {} } = jobData;

    const { data: result, error } = await supabase
      .from('background_jobs')
      .insert({
        job_type,
        query_text,
        product_id,
        priority,
        status: 'pending',
        data,
      })
      .select()
      .single();

    if (error) throw error;
    
    logger.info(`[JobQueue] Enqueued job: ${result.id} (type: ${job_type}, priority: ${priority})`);
    return result;
  }

  /**
   * Get next batch of pending jobs, ordered by priority.
   * Only returns jobs that:
   *   - Are in 'pending' or 'retry' status
   *   - Have not exceeded maxRetries attempts
   *   - Are due to run (next_run_at is null or in the past)
   *
   * @param {number} limit     Max jobs to return per poll
   * @param {number} maxRetries Threshold — jobs at or above this attempt count are excluded
   */
  async getPendingJobs(limit = 10, maxRetries = 3) {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('background_jobs')
      .select('*')
      .in('status', ['pending', 'retry'])
      .lt('attempts', maxRetries)               // CRITICAL FIX: exclude exhausted jobs
      .or(`next_run_at.is.null,next_run_at.lte.${now}`)  // respect retry delay
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      logger.error('[JobQueue] getPendingJobs failed: ' + (error.message || JSON.stringify(error)));
      throw error;
    }

    return data || [];
  }

  /**
   * Update job status
   */
  async updateJob(jobId, updates) {
    const { error } = await supabase
      .from('background_jobs')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    if (error) throw error;
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId) {
    const { data, error } = await supabase
      .from('background_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Count pending jobs
   */
  async getPendingCount() {
    const { count, error } = await supabase
      .from('background_jobs')
      .select('*', { count: 'exact', head: true })
      .in('status', ['pending', 'retry']);

    if (error) throw error;
    return count;
  }

  /**
   * Clear completed jobs older than N days
   */
  async clearOldJobs(olderThanDays = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const { error } = await supabase
      .from('background_jobs')
      .delete()
      .eq('status', 'completed')
      .lt('completed_at', cutoffDate.toISOString());

    if (error) throw error;
    logger.info(`[JobQueue] Cleared old completed jobs (older than ${olderThanDays} days)`);
  }
}

module.exports = new JobQueue();
