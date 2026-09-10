import { useLocation } from 'react-router-dom';

export function usePlannedModulePage() {
  const location = useLocation();
  return { location };
}
