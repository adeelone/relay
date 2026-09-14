export interface ApiKeyRecord {
  id: string;
  keyHash: string;
  keyPrefix: string;
  role: string;
  rateLimitPerMinute: number;
  createdAt: string;
  revokedAt?: string;
}
