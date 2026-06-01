-- TicketScan schema para Supabase PostgreSQL

CREATE TABLE IF NOT EXISTS tickets (
  id            SERIAL PRIMARY KEY,
  fecha_escaneo TIMESTAMPTZ DEFAULT NOW(),
  tienda        TEXT,
  fecha_compra  TEXT,
  hora          TEXT,
  ticket_num    TEXT,
  metodo_pago   TEXT,
  subtotal      REAL,
  descuentos    REAL,
  iva           REAL,
  total         REAL,
  notas         TEXT,
  datos_json    TEXT NOT NULL,
  deleted_at    TIMESTAMPTZ,
  imagen_path   TEXT,
  deducible     INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS productos (
  id              SERIAL PRIMARY KEY,
  ticket_id       INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
  nombre          TEXT,
  cantidad        REAL,
  precio_unitario REAL,
  precio_total    REAL,
  categoria       TEXT
);

CREATE TABLE IF NOT EXISTS budgets (
  categoria TEXT PRIMARY KEY,
  importe   REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS tags (
  ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  tag       TEXT NOT NULL,
  UNIQUE(ticket_id, tag)
);

CREATE TABLE IF NOT EXISTS price_alerts (
  id              SERIAL PRIMARY KEY,
  nombre          TEXT NOT NULL,
  precio_objetivo REAL NOT NULL,
  activa          INTEGER DEFAULT 1,
  ultima_alerta   TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS shares (
  token     TEXT PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  creado    TIMESTAMPTZ DEFAULT NOW(),
  expira    TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS custom_categories (
  nombre   TEXT PRIMARY KEY,
  icono    TEXT DEFAULT '📦',
  color    TEXT DEFAULT '#00E5A0',
  keywords TEXT DEFAULT ''
);

-- Índices útiles
CREATE INDEX IF NOT EXISTS idx_tickets_deleted ON tickets(deleted_at);
CREATE INDEX IF NOT EXISTS idx_productos_ticket ON productos(ticket_id);
CREATE INDEX IF NOT EXISTS idx_productos_nombre ON productos(LOWER(TRIM(nombre)));
CREATE INDEX IF NOT EXISTS idx_tags_ticket ON tags(ticket_id);

-- Bucket para imágenes (ejecutar en Supabase Dashboard → Storage → New Bucket)
-- Nombre: "ticket-images", public: true
