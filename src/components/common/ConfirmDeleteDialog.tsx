import { useState } from 'react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ConfirmDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  confirmWord?: string; // se definido, exige escrever a palavra
  onConfirm: () => void | Promise<void>;
  destructive?: boolean;
}

export function ConfirmDeleteDialog({
  open, onOpenChange, title = 'Eliminar registo',
  description = 'Esta acção é irreversível.', confirmWord, onConfirm,
}: ConfirmDeleteDialogProps) {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const canConfirm = !confirmWord || typed === confirmWord;

  const handle = async () => {
    if (!canConfirm) return;
    setBusy(true);
    try { await onConfirm(); onOpenChange(false); setTyped(''); }
    finally { setBusy(false); }
  };

  return (
    <AlertDialog open={open} onOpenChange={(o) => { if (!o) setTyped(''); onOpenChange(o); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {confirmWord && (
          <div className="space-y-2">
            <Label className="text-xs">Escreve <strong>{confirmWord}</strong> para confirmar:</Label>
            <Input value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus />
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => { e.preventDefault(); handle(); }}
            disabled={!canConfirm || busy}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {busy ? 'A eliminar...' : 'Eliminar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
