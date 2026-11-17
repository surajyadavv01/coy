import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { seedProfiles } from "./seed-profiles.js";

// Database file location. Override with COY_DB_PATH if needed.
const DB_PATH =
  process.env.COY_DB_PATH || path.join(process.cwd(), "data", "coy.db");

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS profiles (
    id        INTEGER PRIMARY KEY,
    name      TEXT    NOT NULL,
    age       INTEGER NOT NULL,
    city      TEXT    NOT NULL,
    bio       TEXT    NOT NULL,
    interests TEXT    NOT NULL,            -- JSON array of strings
    emoji     TEXT    NOT NULL,
    -- Simulated "other side": 1 means this fictional profile already liked
    -- the current user. Used only on the server, never sent to the client.
    likes_you INTEGER NOT NULL DEFAULT 0 CHECK (likes_you IN (0, 1))
  );

  CREATE TABLE IF NOT EXISTS swipes (
    -- PRIMARY KEY on profile_id => a profile can only be swiped once.
    profile_id INTEGER PRIMARY KEY REFERENCES profiles(id),
    action     TEXT    NOT NULL CHECK (action IN ('like', 'pass')),
    created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );
`;

function initialise(db) {
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);

  // Seed mock profiles. INSERT OR IGNORE makes this safe to run on every start.
  const insert = db.prepare(
    `INSERT OR IGNORE INTO profiles
       (id, name, age, city, bio, interests, emoji, likes_you)
     VALUES (@id, @name, @age, @city, @bio, @interests, @emoji, @likes_you)`
  );
  const seed = db.transaction((rows) => {
    for (const p of rows) {
      insert.run({
        id: p.id,
        name: p.name,
        age: p.age,
        city: p.city,
        bio: p.bio,
        interests: JSON.stringify(p.interests),
        emoji: p.emoji,
        likes_you: p.likedYou ? 1 : 0,
      });
    }
  });
  seed(seedProfiles);
}

// Reuse one connection across hot reloads in development.
const globalForDb = globalThis;

export function getDb() {
  if (!globalForDb.__coyDb) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    const db = new Database(DB_PATH);
    initialise(db);
    globalForDb.__coyDb = db;
  }
  return globalForDb.__coyDb;
}
