import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../api';
import { Button } from '../../../shared/ui/Button';

export function DemoAccessSlide() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function demo() {
    setBusy(true);
    try {
      await api('/auth/demo', {});
      navigate('/os');
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="section-wrap canonical-controls">
      <Button onClick={demo} disabled={busy}>
        Explore the workspace
      </Button>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
