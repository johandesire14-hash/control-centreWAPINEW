CREATE TABLE IF NOT EXISTS oauth_exchange_codes (
  code varchar(128) PRIMARY KEY,
  session_id varchar NOT NULL,
  is_new_user varchar(5) NOT NULL DEFAULT 'false',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS oauth_exchange_codes_expire_idx ON oauth_exchange_codes (expires_at);
