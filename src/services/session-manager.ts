// =============================================================================
// nanobanana-mcp-server — Session Manager for Multi-Turn Editing
// =============================================================================

import { v4 as uuidv4 } from "uuid";

import { SESSION_TIMEOUT_MS } from "../constants.js";

import type { GeminiContent, GenerationConfig, GeminiSearchTool, SessionState, SessionSummary } from "../types.js";

// -----------------------------------------------------------------------------
// Session Store
// -----------------------------------------------------------------------------

/** In-memory store of active sessions keyed by session ID. */
const sessions: Map<string, SessionState> = new Map();

// -----------------------------------------------------------------------------
// Periodic Cleanup
// -----------------------------------------------------------------------------

/** Interval handle for the background cleanup timer. */
let cleanupIntervalHandle: ReturnType<typeof setInterval> | null = null;

/**
 * Removes all sessions that have been inactive for longer than
 * SESSION_TIMEOUT_MS.  Returns the number of sessions removed.
 */
function cleanupExpiredSessions(): number {
  const now = Date.now();
  let removed = 0;

  for (const [id, session] of sessions) {
    const lastAccess = new Date(session.lastAccessedAt).getTime();
    if (now - lastAccess > SESSION_TIMEOUT_MS) {
      sessions.delete(id);
      removed++;
      console.error(`[session-manager] Expired session ${id} (inactive for >${SESSION_TIMEOUT_MS / 60_000}min)`);
    }
  }

  return removed;
}

/**
 * Starts the periodic cleanup interval.  Safe to call multiple times — only
 * the first call creates the timer.  The interval runs every SESSION_TIMEOUT_MS
 * and unref()s itself so it does not keep the Node process alive.
 */
function ensureCleanupTimer(): void {
  if (cleanupIntervalHandle !== null) {
    return;
  }
  cleanupIntervalHandle = setInterval(cleanupExpiredSessions, SESSION_TIMEOUT_MS);
  // Allow the Node process to exit even if the timer is still pending.
  if (typeof cleanupIntervalHandle === "object" && "unref" in cleanupIntervalHandle) {
    cleanupIntervalHandle.unref();
  }
}

// Start the cleanup timer on module load.
ensureCleanupTimer();

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

/**
 * Creates a new multi-turn editing session.
 *
 * @param modelId          - The Gemini model ID to use for this session.
 * @param initialContents  - Optional initial conversation history.
 * @param generationConfig - The generationConfig to persist for this session.
 * @param tools            - Optional tools config (search grounding) to persist.
 * @returns An object containing the new `sessionId` and the full `SessionState`.
 */
export function createSession(
  modelId: string,
  initialContents?: GeminiContent[],
  generationConfig?: GenerationConfig,
  tools?: GeminiSearchTool[],
  responseFormat: "markdown" | "json" = "markdown",
): { sessionId: string; session: SessionState } {
  const sessionId = uuidv4();
  const now = new Date().toISOString();

  const session: SessionState = {
    id: sessionId,
    modelId,
    contents: initialContents ? [...initialContents] : [],
    generationConfig: generationConfig ?? { responseModalities: ["TEXT", "IMAGE"] },
    tools,
    responseFormat,
    createdAt: now,
    lastAccessedAt: now,
  };

  sessions.set(sessionId, session);
  console.error(`[session-manager] Created session ${sessionId} (model: ${modelId})`);

  return { sessionId, session };
}

/**
 * Retrieves an active session by ID.  Performs a lazy timeout check: if the
 * session has been inactive for longer than SESSION_TIMEOUT_MS, it is deleted
 * and null is returned.
 *
 * On successful retrieval the `lastAccessedAt` timestamp is updated.
 *
 * @param sessionId - The session ID to look up.
 * @returns The SessionState, or null if not found or expired.
 */
export function getSession(sessionId: string): SessionState | null {
  const session = sessions.get(sessionId);

  if (!session) {
    return null;
  }

  // Lazy expiry check
  const lastAccess = new Date(session.lastAccessedAt).getTime();
  if (Date.now() - lastAccess > SESSION_TIMEOUT_MS) {
    sessions.delete(sessionId);
    console.error(`[session-manager] Session ${sessionId} expired on access`);
    return null;
  }

  // Touch the session
  session.lastAccessedAt = new Date().toISOString();
  return session;
}

/**
 * Appends a new content entry (user or model turn) to the session's
 * conversation history.  Updates the `lastAccessedAt` timestamp.
 *
 * @param sessionId - The session to update.
 * @param content   - The GeminiContent entry to append.
 * @returns true if the session was found and updated, false otherwise.
 */
export function appendToSession(
  sessionId: string,
  content: GeminiContent,
): boolean {
  const session = getSession(sessionId);
  if (!session) {
    return false;
  }

  session.contents.push(content);
  session.lastAccessedAt = new Date().toISOString();
  return true;
}

/**
 * Deletes a session from the store.
 *
 * @param sessionId - The session to remove.
 * @returns true if the session existed and was deleted, false otherwise.
 */
export function deleteSession(sessionId: string): boolean {
  const existed = sessions.delete(sessionId);
  if (existed) {
    console.error(`[session-manager] Deleted session ${sessionId}`);
  }
  return existed;
}

/**
 * Returns metadata summaries for all active (non-expired) sessions.
 * Expired sessions are pruned during enumeration.
 */
export function listSessions(): SessionSummary[] {
  const now = Date.now();
  const summaries: SessionSummary[] = [];

  for (const [id, session] of sessions) {
    const lastAccess = new Date(session.lastAccessedAt).getTime();

    // Prune expired sessions encountered during listing
    if (now - lastAccess > SESSION_TIMEOUT_MS) {
      sessions.delete(id);
      console.error(`[session-manager] Pruned expired session ${id} during list`);
      continue;
    }

    // Turn count = number of user turns in the conversation
    const turnCount = session.contents.filter(
      (c) => c.role === "user",
    ).length;

    summaries.push({
      id: session.id,
      model: session.modelId,
      turn_count: turnCount,
      created_at: session.createdAt,
      last_accessed_at: session.lastAccessedAt,
    });
  }

  return summaries;
}
