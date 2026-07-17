export interface VaultItem {
  id: string;
  label: string;
  account: string;
  secret: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface VaultPayload {
  label: string;
  account: string;
  secret: string;
  notes: string;
}

export interface VaultEncryptedRow {
  id: string;
  encrypted_payload: string;
  encryption_iv: string;
  auth_tag: string;
  created_at: string;
  updated_at: string;
}
