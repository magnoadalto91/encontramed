import React from 'react';
import Badge from '../ui/Badge';

const STATUS_CONFIG = {
  ABERTO:       { label: 'Aberto',       variant: 'success' },
  CANDIDATADO:  { label: 'Candidatado',  variant: 'info' },
  CONFIRMADO:   { label: 'Confirmado',   variant: 'accent' },
  EM_ANDAMENTO: { label: 'Em andamento', variant: 'warning' },
  REALIZADO:    { label: 'Realizado',    variant: 'muted' },
  CANCELADO:    { label: 'Cancelado',    variant: 'danger' },
  EXPIRADO:     { label: 'Expirado',     variant: 'muted' },
};

export default function StatusBadge({ status, size }) {
  const cfg = STATUS_CONFIG[status] || { label: status, variant: 'muted' };
  return <Badge label={cfg.label} variant={cfg.variant} size={size} />;
}
