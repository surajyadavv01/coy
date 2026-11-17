// Deletes the local SQLite database so the demo starts fresh (re-seeded on next run).
import fs from "node:fs";
import path from "node:path";

const dir = path.join(process.cwd(), "data");
let removed = 0;
for (const file of ["coy.db", "coy.db-wal", "coy.db-shm"]) {
  const target = path.join(dir, file);
  if (fs.existsSync(target)) {
    fs.rmSync(target);
    removed++;
  }
}
console.log(removed ? "Database reset. It will be re-created on the next run." : "No database found - nothing to reset.");
