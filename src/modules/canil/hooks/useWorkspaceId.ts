import { useModuloActivo } from '@/hooks/useModuloActivo';

/** Returns the workspace selected by the shared FKT Core context. */
export function useWorkspaceId() {
  const { workspace } = useModuloActivo();
  return workspace?.id ?? null;
}
