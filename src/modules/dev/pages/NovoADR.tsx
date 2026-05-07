import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useProjectos } from '../hooks/useProjectos';

/**
 * NovoADR: redirects to ProjectoDetail with the ADRs tab open.
 * Accepts ?projecto=<id>; if missing, falls back to the most recent project.
 */
export function NovoADR() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const projectoQuery = params.get('projecto');
  const { data: projectos, isLoading } = useProjectos();

  useEffect(() => {
    if (projectoQuery) {
      navigate(`/dev/projecto/${projectoQuery}?tab=adrs&novo=1`, { replace: true });
      return;
    }
    if (!isLoading && projectos) {
      if (projectos.length > 0) {
        navigate(`/dev/projecto/${projectos[0].id}?tab=adrs&novo=1`, { replace: true });
      } else {
        navigate('/dev', { replace: true });
      }
    }
  }, [projectoQuery, projectos, isLoading, navigate]);

  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}
