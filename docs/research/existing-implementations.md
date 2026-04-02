# Existing Implementations: Nano Banana / Gemini Image MCP Servers

**Research date:** 2026-04-01
**Researcher:** Claude (Opus 4.6)
**Status:** PARTIAL -- web search and fetch tools were unavailable during this research session. Findings below are based on the researcher's training knowledge (cutoff: May 2025) and local project context. A follow-up session with web access is strongly recommended to verify URLs and discover post-May-2025 developments.

---

## 1. Search Queries Attempted (All Blocked)

The following searches were planned but could not be executed due to tool permission restrictions:

1. `"Nano Banana MCP server github"` -- WebSearch denied
2. `"Gemini image generation MCP server typescript"` -- WebSearch denied
3. `"nanobanana MCP server image generation"` -- WebSearch denied
4. `"gemini-2.0-flash image MCP tool github"` -- WebSearch denied
5. GitHub API searches via `gh search repos` -- Bash denied
6. Direct GitHub search URL fetches -- WebFetch denied

---

## 2. Findings from Training Knowledge (Pre-May 2025)

### 2.1 "Nano Banana" or "nanobanana" MCP Server

**No known existing implementation found.** As of the training cutoff (May 2025), there is no publicly known MCP server project specifically branded "Nano Banana" or "nanobanana." This appears to be a new/original project name. The local project context (agent configs in `.claude/agents/`) confirms this is being built from scratch.

### 2.2 Gemini Image Generation MCP Servers

Several related projects existed or were emerging in the MCP ecosystem:

#### a) google-gemini/gemini-mcp-server (Possibly Not Yet Image-Focused)
- **Source:** Likely at `https://github.com/google-gemini/` org or similar
- **Description:** Google was developing official MCP integrations for Gemini. As of early 2025, these focused primarily on text generation and function calling, not native image generation.
- **Relevance:** Medium. Architecture patterns (auth handling, model selection) may be useful even if image generation was not yet exposed.

#### b) Community Gemini MCP Wrappers
- Multiple community projects wrapped Gemini APIs as MCP tools. Common patterns observed:
  - Used `@google/genai` SDK (note: this project explicitly avoids that SDK, using raw `fetch` instead)
  - Typically exposed `generateContent` as a single MCP tool
  - Rarely handled image output (base64 encoding, multi-turn image editing)
  - Most used the older `server.tool()` API rather than `McpServer.registerTool()`

#### c) Gemini 2.0 Flash Image Generation (Imagen 3 via Gemini)
- **Model:** `gemini-2.0-flash-exp` and later `gemini-2.0-flash` gained native image generation capabilities
- **API endpoint:** `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`
- **Key details:**
  - Image generation is triggered by setting `responseModalities: ["TEXT", "IMAGE"]` in `generationConfig`
  - Responses include `inlineData` parts with `mimeType: "image/png"` and base64-encoded `data`
  - Image editing works by sending an image (as `inlineData`) plus a text prompt in a multi-turn conversation
  - Authentication via `x-goog-api-key` header
- **No dedicated MCP server for this capability was widely known as of May 2025.** This is a gap this project aims to fill.

### 2.3 General Image Generation MCP Servers (Non-Gemini)

Several MCP servers for image generation existed for other providers and offer useful architectural references:

#### a) DALL-E / OpenAI Image MCP Servers
- Multiple implementations wrapping OpenAI's DALL-E 3 API as MCP tools
- Common patterns:
  - `generate_image` tool with prompt, size, quality parameters
  - `edit_image` tool accepting a base image + mask + prompt
  - Return base64 image data or URLs
  - Session management for multi-step editing workflows
- **Relevance:** High for tool schema design and session management patterns.

#### b) Stability AI / Stable Diffusion MCP Servers
- Community wrappers around Stability AI API
- Patterns: similar tool decomposition (generate, edit, upscale, inpaint)
- **Relevance:** Medium. The multi-tool pattern (separate tools for generate vs. edit vs. style transfer) is a useful reference.

#### c) Replicate MCP Server
- **Source:** Community projects wrapping Replicate's API
- Supported multiple image models behind a unified MCP interface
- **Relevance:** Low-medium. Different architecture (model routing) but useful error handling patterns.

---

## 3. Architectural Patterns Observed Across Existing MCP Image Servers

### 3.1 Tool Decomposition
Most mature image MCP servers split functionality into distinct tools rather than one monolithic tool:
- `generate` -- text-to-image creation
- `edit` -- modify an existing image with a prompt
- `info` -- retrieve metadata about generated images or sessions
- Some add: `upscale`, `inpaint`, `variations`, `style_transfer`

This aligns with the tool files planned in this project: `generate.ts`, `edit.ts`, `multi-edit.ts`, `info.ts`.

### 3.2 Session/State Management
- Image editing workflows are inherently stateful (need to reference previously generated images)
- Common approaches:
  - **In-memory session store** keyed by session ID or image ID
  - **File-based persistence** for generated images (temp directory)
  - **Base64 round-tripping** -- return base64 to the client, accept it back for edits
- This project plans a dedicated `session-manager.ts` service, which is consistent with best practices.

### 3.3 MCP SDK Usage
- Older servers used `server.tool()` API (now deprecated)
- Modern pattern uses `McpServer` class with `registerTool()` method
- Best practice includes `annotations` object with hints: `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`
- Modern pattern returns both `content` (text) and `structuredContent` (typed object)

### 3.4 Error Handling
- Gemini API can return various error codes (400 for safety filters, 429 for rate limits, 503 for overload)
- Best MCP servers translate API errors into actionable user-facing messages with fix suggestions
- Rate limit handling with retry-after headers is important for image generation (slower than text)

### 3.5 Image Data Handling
- Base64 encoding/decoding is CPU-intensive for large images
- Common pattern: stream or chunk large responses
- Character limits on MCP responses mean large base64 strings may need truncation or alternative delivery
- This project plans a `CHARACTER_LIMIT` constant of 25,000 chars and an `image-handler.ts` service

---

## 4. Key Technical References (From Training Knowledge)

| Resource | URL (Unverified -- Needs Web Confirmation) | Notes |
|----------|---------------------------------------------|-------|
| MCP TypeScript SDK | `https://github.com/modelcontextprotocol/typescript-sdk` | Primary SDK reference |
| MCP Specification | `https://spec.modelcontextprotocol.io/` | Protocol specification |
| Gemini API Docs | `https://ai.google.dev/api/generate-content` | Image generation via generateContent |
| Gemini Image Gen Guide | `https://ai.google.dev/gemini-api/docs/image-generation` | Native image output docs |
| MCP Tool Best Practices | `https://modelcontextprotocol.io/docs/concepts/tools` | Tool design guidance |

---

## 5. Gaps and Recommendations

### 5.1 This Project Fills a Clear Gap
No widely known MCP server specifically dedicated to Gemini's native image generation capabilities existed as of May 2025. This project (nanobanana-mcp-server) appears to be an original implementation.

### 5.2 Follow-Up Research Needed
When web access is available, the following should be verified:
1. **GitHub search for new repos** -- The Gemini image generation MCP space may have new entries post-May 2025.
2. **Gemini API changes** -- Verify the `v1beta` endpoint is still current; Google frequently promotes beta APIs to `v1`.
3. **MCP SDK version** -- Confirm latest `@modelcontextprotocol/sdk` version and any breaking changes to `registerTool()`.
4. **Model ID** -- Confirm `gemini-2.0-flash` is the correct model identifier for image generation (Google renames models periodically).
5. **npmjs.com search** -- Check for any published `nanobanana` or `gemini-image-mcp` npm packages.

### 5.3 Design Validation
The planned architecture (as seen in `.claude/agents/`) aligns well with patterns from existing image MCP servers:
- Separate tools for generate, edit, multi-edit, info
- Dedicated services layer (gemini-client, image-handler, session-manager, shared-utils)
- Raw fetch instead of SDK (reduces dependency, gives full control over request shaping)
- Modern MCP SDK patterns (registerTool, annotations, structuredContent)

---

## 6. Summary

| Question | Answer |
|----------|--------|
| Does a "nanobanana" MCP server already exist? | **No** (not found) |
| Does a Gemini image generation MCP server exist? | **No widely known dedicated one** as of May 2025 |
| Are there useful architectural references? | **Yes** -- from DALL-E, Stability, and general MCP image servers |
| Is the planned architecture sound? | **Yes** -- consistent with best practices observed in the ecosystem |
| Is follow-up web research needed? | **Yes** -- strongly recommended when WebSearch/WebFetch are available |
