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
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: '#1e40af',
        color: 'white',
        padding: '12px 20px',
        zIndex: 9999,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        {/* Left: Message */}
        <div style={{ flex: '1 1 auto', minWidth: '200px' }}>
          <div style={{ fontWeight: '600', marginBottom: '4px' }}>
            🔄 Đang xử lý dữ liệu cũ
          </div>
          <div style={{ fontSize: '13px', opacity: 0.9 }}>
            {progress.clipped.toLocaleString()} / {progress.total.toLocaleString()} records
            {progress.eta && ` • Còn ~${progress.eta}`}
          </div>
        </div>

        {/* Right: Progress Bar */}
        <div style={{ flex: '1 1 auto', minWidth: '250px', maxWidth: '400px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            {/* Progress bar */}
            <div
              style={{
                flex: 1,
                height: '8px',
                backgroundColor: 'rgba(255,255,255,0.2)',
                borderRadius: '4px',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  height: '100%',
                  backgroundColor: '#10b981',
                  width: `${progress.progress}%`,
                  transition: 'width 0.3s ease'
                }}
              />
            </div>

            {/* Percentage */}
            <div
              style={{
                minWidth: '50px',
                textAlign: 'right',
                fontWeight: '600',
                fontSize: '14px'
              }}
            >
              {progress.progress.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClipProgressBanner;
