import { useState, useEffect } from 'react';

/**
 * Custom hook for responsive media queries
 * @param {string} query - Media query string (e.g., '(max-width: 640px)')
 * @returns {boolean} - True if media query matches
 */
export const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);

    // Set initial value
    if (media.matches !== matches) {
      setMatches(media.matches);
    }

    // Listen for changes
    const listener = () => setMatches(media.matches);

    // Modern browsers
    if (media.addEventListener) {
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    } else {
      // Fallback for older browsers
      media.addListener(listener);
      return () => media.removeListener(listener);
    }
  }, [matches, query]);

  return matches;
};

/**
 * Hook to detect mobile devices (< 640px)
 * @returns {boolean} - True if viewport is mobile size
 */
export const useIsMobile = () => useMediaQuery('(max-width: 639px)');

/**
 * Hook to detect tablet devices (640px - 1023px)
 * @returns {boolean} - True if viewport is tablet size
 */
export const useIsTablet = () => useMediaQuery('(min-width: 640px) and (max-width: 1023px)');

/**
 * Hook to detect desktop devices (>= 1024px)
 * @returns {boolean} - True if viewport is desktop size
 */
export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)');

/**
 * Hook to detect if viewport is mobile or tablet (< 1024px)
 * Useful for showing/hiding elements that should only appear on desktop
 * @returns {boolean} - True if viewport is mobile or tablet
 */
export const useIsMobileOrTablet = () => useMediaQuery('(max-width: 1023px)');
