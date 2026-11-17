"use client";

import { useEffect, useState } from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useTransform,
} from "framer-motion";
import { fetchMatches, fetchProfiles, postSwipe } from "@/lib/api-client";

// Complete class strings so Tailwind can detect them.
const GRADIENTS = [
  "from-violet-500 to-indigo-600",
  "from-fuchsia-500 to-violet-600",
  "from-indigo-500 to-sky-500",
  "from-purple-500 to-pink-500",
  "from-violet-600 to-blue-500",
];
const gradientFor = (id) => GRADIENTS[id % GRADIENTS.length];

export default function Home() {
  const [tab, setTab] = useState("discover");
  const [profiles, setProfiles] = useState([]);
  const [total, setTotal] = useState(0);
  const [matches, setMatches] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [matchModal, setMatchModal] = useState(null);

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-12, 0, 12]);
  const likeOpacity = useTransform(x, [20, 120], [0, 1]);
  const passOpacity = useTransform(x, [-120, -20], [1, 0]);

  const profile = profiles[0];
  const seen = total - profiles.length;

  // Load everything from the backend (no LocalStorage involved).
  async function loadAll() {
    try {
      const [profileData, matchData] = await Promise.all([
        fetchProfiles(),
        fetchMatches(),
      ]);
      setProfiles(profileData.profiles);
      setTotal(profileData.total);
      setMatches(matchData.matches);
      setLoadError("");
      setStatus("ready");
    } catch (error) {
      setLoadError(error.message);
      setStatus("error");
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  function retry() {
    setStatus("loading");
    loadAll();
  }

  // Send the swipe to the server; the server decides whether it is a match.
  async function swipe(action) {
    if (!profile || busy) return;
    setBusy(true);
    setActionError("");
    setNotice("");

    const swiped = profile;
    await animate(x, action === "like" ? 500 : -500, { duration: 0.22 });

    try {
      const result = await postSwipe(swiped.id, action);
      setProfiles((current) => current.filter((p) => p.id !== swiped.id));
      x.set(0);

      if (result.matched) {
        setMatches((current) =>
          current.some((m) => m.id === result.match.id)
            ? current
            : [result.match, ...current]
        );
        setMatchModal(result.match);
        // Re-sync the list with the server so the count is authoritative.
        fetchMatches()
          .then((data) => setMatches(data.matches))
          .catch(() => {});
      } else {
        setNotice(action === "like" ? "Liked!" : "Passed");
      }
    } catch (error) {
      if (error.status === 409) {
        // Already swiped elsewhere (e.g. another tab): drop the card.
        setProfiles((current) => current.filter((p) => p.id !== swiped.id));
        x.set(0);
      } else {
        setActionError(error.message);
        await animate(x, 0, { duration: 0.2 });
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleDragEnd(event, info) {
    if (busy) return;
    if (info.offset.x > 100) {
      swipe("like");
    } else if (info.offset.x < -100) {
      swipe("pass");
    } else {
      animate(x, 0, { duration: 0.2 });
    }
  }

  function openTab(next) {
    setTab(next);
    setNotice("");
    setActionError("");
    if (next === "matches" && status === "ready") {
      fetchMatches()
        .then((data) => setMatches(data.matches))
        .catch(() => {});
    }
  }

  if (status === "loading") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f7f6fc]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
        <p className="font-semibold text-violet-700">Loading Coy Discover...</p>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f6fc] px-5">
        <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-lg">
          <div className="text-5xl">⚠️</div>
          <h2 className="mt-4 text-xl font-bold">Couldn&apos;t load profiles</h2>
          <p className="mt-2 text-sm text-gray-500">{loadError}</p>
          <button
            onClick={retry}
            className="mt-6 rounded-xl bg-violet-600 px-6 py-3 font-semibold text-white hover:bg-violet-700"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#f7f6fc] to-violet-50 text-gray-900">
      {/* Header */}
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <h1 className="text-3xl font-black tracking-tight text-violet-700">
          coy<span className="text-gray-900">.</span>
        </h1>
        <span className="rounded-full bg-violet-100 px-4 py-2 text-xs font-semibold text-violet-700">
          DEMO APP
        </span>
      </header>

      {/* Navigation */}
      <nav className="mx-auto flex max-w-md gap-2 px-5 pb-5">
        {[
          ["discover", "Discover"],
          ["matches", `Matches (${matches.length})`],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => openTab(key)}
            className={`flex-1 rounded-xl py-3 font-semibold transition ${
              tab === key
                ? "bg-violet-600 text-white shadow-md shadow-violet-200"
                : "bg-white text-gray-600 hover:bg-violet-50"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === "discover" ? (
        <section className="mx-auto max-w-md px-5 pb-12">
          <div className="mb-5">
            <h2 className="text-2xl font-bold">Discover people</h2>
            <p className="mt-1 text-sm text-gray-500">
              Swipe right to like, left to pass.
            </p>
          </div>

          {actionError && (
            <div
              role="alert"
              className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
            >
              {actionError}
            </div>
          )}

          {profile ? (
            <div className="relative">
              {profiles[1] && (
                <div className="absolute inset-x-4 top-3 -z-10 h-full rounded-3xl bg-white/70 shadow-md" />
              )}

              <motion.div
                key={profile.id}
                drag={busy ? false : "x"}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.9}
                onDragEnd={handleDragEnd}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.2 }}
                style={{ x, rotate, touchAction: "pan-y" }}
                className="relative overflow-hidden rounded-3xl bg-white shadow-xl shadow-violet-100 cursor-grab active:cursor-grabbing"
              >
                {/* Profile image */}
                <div
                  className={`relative flex h-72 items-center justify-center bg-gradient-to-br ${gradientFor(
                    profile.id
                  )}`}
                >
                  <span className="select-none text-9xl drop-shadow-lg">
                    {profile.emoji}
                  </span>
                  <motion.span
                    style={{ opacity: likeOpacity }}
                    className="absolute left-5 top-5 -rotate-12 rounded-lg border-4 border-emerald-300 px-3 py-1 text-2xl font-black text-emerald-300"
                  >
                    LIKE
                  </motion.span>
                  <motion.span
                    style={{ opacity: passOpacity }}
                    className="absolute right-5 top-5 rotate-12 rounded-lg border-4 border-rose-200 px-3 py-1 text-2xl font-black text-rose-200"
                  >
                    PASS
                  </motion.span>
                </div>

                {/* Profile details */}
                <div className="p-6">
                  <h3 className="text-3xl font-bold">
                    {profile.name}, {profile.age}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">📍 {profile.city}</p>
                  <p className="mt-5 text-gray-700">{profile.bio}</p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {profile.interests.map((interest) => (
                      <span
                        key={interest}
                        className="rounded-full bg-violet-50 px-3 py-2 text-xs font-medium text-violet-700"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>

                  <div className="mt-7 flex gap-4">
                    <button
                      onClick={() => swipe("pass")}
                      disabled={busy}
                      className="flex-1 rounded-2xl border border-gray-200 py-4 font-bold text-gray-600 transition hover:bg-gray-50 active:scale-95 disabled:opacity-50"
                    >
                      ✕ Pass
                    </button>
                    <button
                      onClick={() => swipe("like")}
                      disabled={busy}
                      className="flex-1 rounded-2xl bg-violet-600 py-4 font-bold text-white transition hover:bg-violet-700 active:scale-95 disabled:opacity-50"
                    >
                      ♥ Like
                    </button>
                  </div>

                  <p
                    aria-live="polite"
                    className="mt-5 min-h-6 text-center font-semibold text-violet-700"
                  >
                    {notice}
                  </p>

                  <p className="mt-2 text-center text-xs text-gray-400">
                    {seen + 1} of {total} profiles
                  </p>
                </div>
              </motion.div>
            </div>
          ) : (
            <div className="rounded-3xl bg-white p-10 text-center shadow-lg">
              <div className="text-5xl">✨</div>
              <h3 className="mt-4 text-xl font-bold">You are all caught up!</h3>
              <p className="mt-2 text-sm text-gray-500">
                You&apos;ve seen all {total} profiles. Check your matches!
              </p>
              <button
                onClick={() => openTab("matches")}
                className="mt-6 rounded-xl bg-violet-600 px-6 py-3 font-semibold text-white hover:bg-violet-700"
              >
                View matches ({matches.length})
              </button>
            </div>
          )}
        </section>
      ) : (
        <section className="mx-auto max-w-md px-5 pb-12">
          <h2 className="mb-2 text-2xl font-bold">Your Matches</h2>
          <p className="mb-6 text-sm text-gray-500">
            Only mutual likes appear here.
          </p>

          {matches.length === 0 ? (
            <div className="rounded-3xl bg-white p-10 text-center shadow-lg">
              <div className="text-5xl">💜</div>
              <h3 className="mt-4 text-xl font-bold">No matches yet</h3>
              <p className="mt-2 text-sm text-gray-500">
                Your mutual matches will appear here.
              </p>
            </div>
          ) : (
            <ul>
              {matches.map((person) => (
                <motion.li
                  key={person.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-3 flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-100 text-3xl">
                    {person.emoji}
                  </div>
                  <div>
                    <h3 className="font-bold">
                      {person.name}, {person.age}
                    </h3>
                    <p className="text-sm text-gray-500">
                      📍 {person.city} · It&apos;s a match! 💜
                    </p>
                  </div>
                </motion.li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Match celebration */}
      <AnimatePresence>
        {matchModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-5"
            role="dialog"
            aria-modal="true"
            aria-label="New match"
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl"
            >
              <div className="text-6xl">{matchModal.emoji}</div>
              <h3 className="mt-4 text-3xl font-black text-violet-700">
                It&apos;s a match!
              </h3>
              <p className="mt-2 text-gray-600">
                You and {matchModal.name} liked each other.
              </p>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setMatchModal(null)}
                  className="flex-1 rounded-xl border border-gray-200 py-3 font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Keep swiping
                </button>
                <button
                  onClick={() => {
                    setMatchModal(null);
                    openTab("matches");
                  }}
                  className="flex-1 rounded-xl bg-violet-600 py-3 font-semibold text-white hover:bg-violet-700"
                >
                  View matches
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="py-8 text-center text-xs text-gray-400">
        Coy Discover · Development Demo
      </footer>
    </main>
  );
}
