import { useWorkspaceRole, type WorkspaceRole } from '@/hooks/useWorkspaceRole';
import type { ReactNode } from 'react';

interface RoleGateProps {
  roles?: Exclude<WorkspaceRole, null>[];
  requireWrite?: boolean;
  fallback?: ReactNode;
  children: ReactNode;
}

export function RoleGate({ roles, requireWrite, fallback = null, children }: RoleGateProps) {
  const { role, canWrite } = useWorkspaceRole();
  if (requireWrite && !canWrite) return <>{fallback}</>;
  if (roles && (!role || !roles.includes(role))) return <>{fallback}</>;
  return <>{children}</>;
}
