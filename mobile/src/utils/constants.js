export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

export const COLORS = {
  // Primary backgrounds
  bg: '#0A1628',
  cardBg: '#112240',
  cardBg2: '#0D1B33',

  // Accent
  accent: '#26D0CE',
  teal: '#26D0CE',
  blue: '#1A6EBD',

  // Text
  white: '#FFFFFF',
  textPrimary: '#FFFFFF',
  textSecondary: '#C5CDD8',
  textMuted: '#8892A4',
  gray: '#8892A4',
  grayLight: '#C5CDD8',

  // Status
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',

  // Borders
  border: 'rgba(38, 208, 206, 0.2)',
  borderLight: 'rgba(255, 255, 255, 0.08)',

  // Gradients (used as array)
  gradientTeal: ['#26D0CE', '#1A6EBD'],
  gradientDark: ['#112240', '#0A1628'],
  gradientCard: ['rgba(38,208,206,0.15)', 'rgba(26,110,189,0.05)'],

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.7)',
  overlayLight: 'rgba(10, 22, 40, 0.9)',
};

export const STATUS_PLANTAO = {
  ABERTO: {
    label: 'Aberto',
    color: COLORS.teal,
    bg: 'rgba(38, 208, 206, 0.15)',
    icon: 'radio-button-on',
  },
  AGUARDANDO_CONFIRMACAO: {
    label: 'Aguardando',
    color: COLORS.warning,
    bg: 'rgba(245, 158, 11, 0.15)',
    icon: 'time-outline',
  },
  CONFIRMADO: {
    label: 'Confirmado',
    color: COLORS.blue,
    bg: 'rgba(26, 110, 189, 0.15)',
    icon: 'checkmark-circle-outline',
  },
  REALIZADO: {
    label: 'Realizado',
    color: COLORS.success,
    bg: 'rgba(16, 185, 129, 0.15)',
    icon: 'checkmark-done-circle-outline',
  },
  CANCELADO: {
    label: 'Cancelado',
    color: COLORS.danger,
    bg: 'rgba(239, 68, 68, 0.15)',
    icon: 'close-circle-outline',
  },
  URGENTE: {
    label: 'Urgente',
    color: COLORS.danger,
    bg: 'rgba(239, 68, 68, 0.15)',
    icon: 'alert-circle-outline',
  },
};

export const STATUS_CANDIDATURA = {
  PENDENTE: {
    label: 'Pendente',
    color: COLORS.warning,
    bg: 'rgba(245, 158, 11, 0.15)',
  },
  ACEITA: {
    label: 'Aceita',
    color: COLORS.success,
    bg: 'rgba(16, 185, 129, 0.15)',
  },
  REJEITADA: {
    label: 'Rejeitada',
    color: COLORS.danger,
    bg: 'rgba(239, 68, 68, 0.15)',
  },
  CANCELADA: {
    label: 'Cancelada',
    color: COLORS.gray,
    bg: 'rgba(136, 146, 164, 0.15)',
  },
};

export const STATUS_CRM = {
  PENDENTE: {
    label: 'Pendente Validação',
    color: COLORS.warning,
  },
  ATIVO: {
    label: 'Ativo',
    color: COLORS.success,
  },
  SUSPENSO: {
    label: 'Suspenso',
    color: COLORS.danger,
  },
  INATIVO: {
    label: 'Inativo',
    color: COLORS.gray,
  },
};

export const STATUS_FINANCEIRO = {
  PENDENTE: {
    label: 'Pendente',
    color: COLORS.warning,
  },
  A_RECEBER: {
    label: 'A Receber',
    color: COLORS.blue,
  },
  PAGO: {
    label: 'Pago',
    color: COLORS.success,
  },
  CANCELADO: {
    label: 'Cancelado',
    color: COLORS.danger,
  },
};

export const ESPECIALIDADES = [
  'Clínica Geral',
  'Emergência',
  'Pediatria',
  'Cardiologia',
  'Neurologia',
  'Ortopedia',
  'Ginecologia',
  'Obstetrícia',
  'Psiquiatria',
  'Anestesiologia',
  'Radiologia',
  'Cirurgia Geral',
  'UTI',
  'Infectologia',
  'Nefrologia',
  'Endocrinologia',
  'Reumatologia',
  'Urologia',
  'Oftalmologia',
  'Dermatologia',
  'Otorrinolaringologia',
];

export const UF_LIST = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

export const WS_URL = process.env.EXPO_PUBLIC_WS_URL || 'ws://localhost:3000';
