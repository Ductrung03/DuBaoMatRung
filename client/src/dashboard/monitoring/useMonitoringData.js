import { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';
import { normalizeFeatures } from './monitoring-data';

export default function useMonitoringData() {
  const [state, setState] = useState({ rows: [], loading: true, error: '' });
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion(v => v + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    setState({ rows: [], loading: true, error: '' });
    api.get('/search/mat-rung', { params: { limit: 0 }, signal: controller.signal, timeout: 300000 })
      .then(({ data }) => {
        if (!data.success || !Array.isArray(data.data?.features)) throw new Error('Phản hồi dữ liệu không hợp lệ');
        setState({ rows: normalizeFeatures(data.data.features), loading: false, error: '' });
      })
      .catch(error => {
        if (controller.signal.aborted) return;
        setState({ rows: [], loading: false, error: error.response?.data?.message || error.message || 'Không thể tải dữ liệu' });
      });
    return () => controller.abort();
  }, [version]);
  return { ...state, reload };
}
