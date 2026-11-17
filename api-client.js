// Thin browser-side wrapper around the three backend endpoints.
async function request(url, options) {
  let response;
  try {
    response = await fetch(url, { cache: "no-store", ...options });
  } catch {
    throw new Error("Cannot reach the server. Check your connection and try again.");
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    // non-JSON body; handled below
  }

  if (!response.ok) {
    const error = new Error(data?.error || `Request failed (${response.status}).`);
    error.status = response.status;
    throw error;
  }
  return data;
}

export const fetchProfiles = () => request("/api/profiles");
export const fetchMatches = () => request("/api/matches");
export const postSwipe = (profileId, action) =>
  request("/api/swipe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profileId, action }),
  });
