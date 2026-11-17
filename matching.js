import { getDb } from "./db.js";

// Only these columns ever leave the server. `likes_you` is deliberately absent.
const PUBLIC_COLUMNS = "p.id, p.name, p.age, p.city, p.bio, p.interests, p.emoji";

function toPublicProfile(row) {
  return {
    id: row.id,
    name: row.name,
    age: row.age,
    city: row.city,
    bio: row.bio,
    interests: JSON.parse(row.interests),
    emoji: row.emoji,
  };
}

/** Profiles the user has not swiped on yet. */
export function getUnswipedProfiles() {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT ${PUBLIC_COLUMNS}
         FROM profiles p
         LEFT JOIN swipes s ON s.profile_id = p.id
        WHERE s.profile_id IS NULL
        ORDER BY p.id`
    )
    .all();
  const total = db.prepare("SELECT COUNT(*) AS n FROM profiles").get().n;
  return { profiles: rows.map(toPublicProfile), total };
}

/**
 * Record a swipe. Returns one of:
 *   { status: "not_found" }
 *   { status: "duplicate" }
 *   { status: "ok", matched: boolean, profile?: PublicProfile }
 *
 * A match exists only when the user liked a profile that has liked the user.
 * The profile is returned only for a mutual match.
 */
export function recordSwipe(profileId, action) {
  const db = getDb();

  const run = db.transaction(() => {
    const profile = db
      .prepare("SELECT * FROM profiles WHERE id = ?")
      .get(profileId);
    if (!profile) return { status: "not_found" };

    // INSERT OR IGNORE + `changes` detects duplicates without relying on error codes.
    const result = db
      .prepare("INSERT OR IGNORE INTO swipes (profile_id, action) VALUES (?, ?)")
      .run(profileId, action);
    if (result.changes === 0) return { status: "duplicate" };

    const matched = action === "like" && profile.likes_you === 1;
    return matched
      ? { status: "ok", matched: true, profile: toPublicProfile(profile) }
      : { status: "ok", matched: false };
  });

  return run();
}

/** Mutual matches only: user liked the profile AND the profile liked the user. */
export function getMatches() {
  const rows = getDb()
    .prepare(
      `SELECT ${PUBLIC_COLUMNS}, s.created_at AS matched_at
         FROM swipes s
         JOIN profiles p ON p.id = s.profile_id
        WHERE s.action = 'like' AND p.likes_you = 1
        ORDER BY s.created_at DESC, p.id DESC`
    )
    .all();
  return rows.map((row) => ({ ...toPublicProfile(row), matchedAt: row.matched_at }));
}
