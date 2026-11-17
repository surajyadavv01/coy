import { recordSwipe } from "@/lib/matching";
import { errorResponse, json, serverError } from "@/lib/http";

const ACTIONS = new Set(["like", "pass"]);

// POST /api/swipe  body: { profileId: number, action: "like" | "pass" }
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Request body must be valid JSON.", 400);
  }

  const { profileId, action } = body ?? {};

  if (!Number.isInteger(profileId) || profileId < 1) {
    return errorResponse("profileId must be a positive integer.", 400);
  }
  if (typeof action !== "string" || !ACTIONS.has(action)) {
    return errorResponse('action must be either "like" or "pass".', 400);
  }

  try {
    const result = recordSwipe(profileId, action);

    if (result.status === "not_found") {
      return errorResponse("Profile not found.", 404);
    }
    if (result.status === "duplicate") {
      return errorResponse("You have already swiped on this profile.", 409);
    }

    return json(
      result.matched
        ? { success: true, matched: true, match: result.profile }
        : { success: true, matched: false }
    );
  } catch (error) {
    return serverError(error);
  }
}
