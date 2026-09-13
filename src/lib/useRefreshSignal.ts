import { useEffect, useRef, useState } from 'react';
// Refresh visible, idle screens on return and once a minute. Never reset a form
// while the user is editing it. Cache TTL still deduplicates these reads.
export function useRefreshSignal(enabled = true) {
  const allowed = useRef(enabled);
  allowed.current = enabled;
  const [signal, setSignal] = useState(0);
  useEffect(() => {
    const refresh = () => {
      if (allowed.current && !document.hidden) setSignal((n) => n + 1);
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    const timer = window.setInterval(refresh, 60000);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      window.clearInterval(timer);
    };
  }, []);
  return signal;
}
