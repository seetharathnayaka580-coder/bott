export interface ClientData {
  id?: string;
  email: string;
  subId?: string;
  tgId?: number | string;
  enable: boolean;
  up: number; // bytes
  down: number; // bytes
  total: number; // total quota in bytes (0 = unlimited)
  expiryTime: number; // timestamp in ms (0 or negative = unlimited)
  reset?: number;
  inboundTag?: string;
  protocol?: string;
}

export type BotLanguage = 'en' | 'si' | 'ru' | 'fa';

export type ProgressBarStyle = 'blocks' | 'solid' | 'dots' | 'squares';

export interface BotConfig {
  botName: string;
  panelUrl: string;
  panelUsername: string;
  panelPassword: string;
  panelBasePath: string;
  botToken: string;
  adminTelegramId: string;
  webhookSecret: string;
  language: BotLanguage;
  progressStyle: ProgressBarStyle;
  enableAutoTgId: boolean;
  enableRefreshButton: boolean;
  enableSubLink: boolean;
  enableExpiryCountdown: boolean;
  enableAdminCommand: boolean;
  enableRateLimit: boolean;
  cacheSessionDurationSeconds: number;
}

export interface WebhookInfo {
  url: string;
  has_custom_certificate: boolean;
  pending_update_count: number;
  ip_address?: string;
  last_error_date?: number;
  last_error_message?: string;
  last_synchronization_error_date?: number;
  max_connections?: number;
}
