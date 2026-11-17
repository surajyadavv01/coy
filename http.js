// Small helpers so every API route responds consistently.
const NO_STORE = { "Cache-Control": "no-store" };

export function json(body, status = 200) {
  return Response.json(body, { status, headers: NO_STORE });
}

export function errorResponse(message, status) {
  return json({ error: message }, status);
}

export function serverError(error) {
  // Log details on the server only; never leak internals to the client.
  console.error("[api] unexpected error:", error);
  return errorResponse("Something went wrong on the server. Please try again.", 500);
}
