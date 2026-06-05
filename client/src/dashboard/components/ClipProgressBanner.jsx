import React, { useEffect, useState } from 'react';
import axios from 'axios';
import config from '../../config';

/**
 * ClipProgressBanner - Shows background clip worker progress
 *
 * Displays a banner at the top of the page when background clipping is in progress
 * Auto-hides when complete
 */
const ClipProgressBanner = () => {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const response = await axios.get(`${config.API_BASE_URL}/mat-rung/clip-progress`);
        setProgress(response.data.data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch clip progress:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchProgress();

    // Poll every 10 seconds
    const interval = setInterval(fetchProgress, 10000);

    return () => clearInterval(interval);
  }, []);

  // Don't show if complete or error
  if (loading) return null;
  if (error) return null;
  if (!progress) return null;
  if (progress.is_complete) return null;
  if (progress.progress >= 100) return null;

  return (
    <></>
  );
};

export default ClipProgressBanner;
