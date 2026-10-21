import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import {useAuth} from '../contexts/AuthContext';
import {isManager} from '../monitoring/monitoring-data';

/**
 * ClipProgressBanner - Shows background clip worker progress
 *
 * Displays a banner at the top of the page when background clipping is in progress
 * Auto-hides when complete
 */
const ClipProgressBanner = () => {
  const {user,token}=useAuth();
  const scoped=Boolean(user?.xa)||isManager(user);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if(!token||!scoped)return;
    const controller=new AbortController();
    const fetchProgress = async () => {
      try {
        const response = await api.get('/mat-rung/clip-progress',{signal:controller.signal});
        setProgress(response.data.data);
        setError(null);
      } catch (err) {
        if(controller.signal.aborted)return;
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

    return () => {controller.abort();clearInterval(interval);};
  }, [token,scoped]);

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
