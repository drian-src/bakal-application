import { useState, useEffect, useCallback } from 'react';
import { getPersonalizedRecommendations } from '../services/apiService';
import { isAuthenticated } from '../services/authService';

/**
 * useRecommendations Hook
 * 
 * Fetches and manages personalized product recommendations for the logged-in user.
 * Uses a hybrid recommendation algorithm (content-based + collaborative filtering).
 * 
 * @param {number} limit - Number of recommendations to fetch (default: 10, max: 20)
 * @returns {Object} { recommendations, loading, error, refetch }
 *   - recommendations: Array of { product, score, explanation, reasonType }
 *   - loading: boolean — true while API call is in progress
 *   - error: string|null — error message if fetch failed, null otherwise
 *   - refetch: function — call to manually trigger a fresh API call
 * 
 * @example
 * const { recommendations, loading, error, refetch } = useRecommendations(10);
 * if (loading) return <SkeletonCards />;
 * if (error) return <ErrorBanner message={error} />;
 * return <RecommendationGrid products={recommendations} />;
 */
export const useRecommendations = (limit = 10) => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchRecommendations = useCallback(async () => {
    // Step 1: Auth check — exit early if user is not authenticated
    if (!isAuthenticated()) {
      setRecommendations([]);
      return;
    }

    try {
      // Step 2: Set loading and clear previous error
      setLoading(true);
      setError(null);

      // Step 3: Fetch recommendations from API
      // getPersonalizedRecommendations never throws — returns empty fallback on error
      const data = await getPersonalizedRecommendations(limit);

      // Step 4: Update recommendations state
      setRecommendations(data.recommendations || []);
    } catch (err) {
      // Step 5: Handle unexpected errors (safety catch)
      setError(err.message);
      setRecommendations([]);
    } finally {
      // Step 6: Always reset loading state
      setLoading(false);
    }
  }, [limit]);

  // Fetch recommendations on mount and when limit changes
  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  return {
    recommendations,
    loading,
    error,
    refetch: fetchRecommendations,
  };
};

export default useRecommendations;
