import { Database } from "bun:sqlite";
import path from "path";
import fsSync from "fs";

const dbPath = path.resolve(__dirname, "../guardian.db");

// Initialize SQLite database
const db = new Database(dbPath);

// Create tables if they do not exist
db.run(`
  CREATE TABLE IF NOT EXISTS analysis (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    fixture_key TEXT,
    risk_level TEXT NOT NULL,
    result_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS feedback (
    id TEXT PRIMARY KEY,
    analysis_id TEXT NOT NULL,
    rating INTEGER NOT NULL,
    note TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(analysis_id) REFERENCES analysis(id)
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS processed_webhook_messages (
    message_id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL
  )
`);

// Bound the table's growth: drop dedup records old enough that Meta would
// never retry-deliver that message again anyway.
const webhookDedupCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
db.prepare("DELETE FROM processed_webhook_messages WHERE created_at < $cutoff").run({ $cutoff: webhookDedupCutoff });

console.log(`💾 SQLite Database initialized at ${dbPath}`);

export interface AnalysisRecord {
  id: string;
  kind: string;
  fixture_key?: string;
  risk_level: string;
  result_json: string;
  created_at: string;
}

export const dbService = {
  saveAnalysis: (record: Omit<AnalysisRecord, "created_at">): void => {
    const query = db.prepare(`
      INSERT OR REPLACE INTO analysis (id, kind, fixture_key, risk_level, result_json, created_at)
      VALUES ($id, $kind, $fixture_key, $risk_level, $result_json, $created_at)
    `);
    
    query.run({
      $id: record.id,
      $kind: record.kind,
      $fixture_key: record.fixture_key || null,
      $risk_level: record.risk_level,
      $result_json: record.result_json,
      $created_at: new Date().toISOString()
    });
  },

  getAnalysis: (id: string): AnalysisRecord | null => {
    const query = db.prepare("SELECT * FROM analysis WHERE id = $id");
    return query.get({ $id: id }) as AnalysisRecord | null;
  },

  listRecentAnalyses: (limit = 10): AnalysisRecord[] => {
    const query = db.prepare("SELECT * FROM analysis ORDER BY created_at DESC LIMIT $limit");
    return query.all({ $limit: limit }) as AnalysisRecord[];
  },

  saveFeedback: (feedback: { id: string; analysisId: string; rating: number; note?: string }): void => {
    const query = db.prepare(`
      INSERT INTO feedback (id, analysis_id, rating, note, created_at)
      VALUES ($id, $analysis_id, $rating, $note, $created_at)
    `);
    
    query.run({
      $id: feedback.id,
      $analysis_id: feedback.analysisId,
      $rating: feedback.rating,
      $note: feedback.note || null,
      $created_at: new Date().toISOString()
    });
  },

  // Durable webhook idempotency check, so retried/duplicate WhatsApp webhook
  // deliveries aren't reprocessed even across API restarts.
  hasProcessedWebhookMessage: (messageId: string): boolean => {
    const query = db.prepare("SELECT 1 FROM processed_webhook_messages WHERE message_id = $id");
    return query.get({ $id: messageId }) !== null;
  },

  markWebhookMessageProcessed: (messageId: string): void => {
    const query = db.prepare(`
      INSERT OR IGNORE INTO processed_webhook_messages (message_id, created_at)
      VALUES ($id, $created_at)
    `);
    query.run({ $id: messageId, $created_at: new Date().toISOString() });
  }
};
