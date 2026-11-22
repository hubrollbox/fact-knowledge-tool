import { toast as notify } from 'sonner';
import type { ReactNode } from 'react';
import type { ToastActionElement, ToastProps } from '@/components/ui/toast';

type LegacyToast = ToastProps & {
  id?: string;
  title?: ReactNode;
  description?: ReactNode;
  action?: ToastActionElement;
};

// Keep immutable Core callers compatible while rendering all notices in Sonner.
export function toast(props: LegacyToast) {
  const show = (value: LegacyToast, id?: string | number) => {
    const options = { id, description: value.description, duration: value.duration, action: value.action, onDismiss: () => value.onOpenChange?.(false) };
    return value.variant === 'destructive'
      ? notify.error(value.title ?? value.description, options)
      : notify(value.title ?? value.description, options);
  };
  const id = String(show(props, props.id));
  return { id, dismiss: () => notify.dismiss(id), update: (next: Partial<LegacyToast>) => show({ ...props, ...next }, id) };
}

export function useToast() {
  return { toast, dismiss: (id?: string) => notify.dismiss(id), toasts: [] };
}