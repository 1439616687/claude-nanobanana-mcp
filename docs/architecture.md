# nanobanana-mcp-server Architecture

## Project Structure

```
nanobanana-mcp-server/
├── package.json              # ESM package config, dependencies
├── tsconfig.json             # Strict TypeScript, ES2020 target
├── docs/
│   ├── architecture.md       # This file: full architecture spec
│   └── research/
│       ├── nano-banana-api.md
│       ├── mcp-sdk.md
│       └── existing-implementations.md
├── src/
│   ├── index.ts              # Entry point: McpServer init, tool registration, StdioServerTransport
│   ├── types.ts              # All TypeScript interfaces and type aliases
│   ├── constants.ts          # API URLs, model IDs, enums, defaults, limits
│   ├── schemas/
│   │   └── tool-schemas.ts   # Zod schemas for all 7 tools (input validation + descriptions)
│   ├── services/
│   │   ├── gemini-client.ts  # Raw fetch wrapper for Gemini REST API
│   │   ├── image-handler.ts  # Base64 encode/decode, file I/O, MIME detection
│   │   ├── session-manager.ts# In-memory session store for multi-turn editing
│   │   └── shared-utils.ts   # Prompt builder, param validation, response formatting, truncation
│   └── tools/
│       ├── generate.ts       # nanobanana_generate_image handler
│       ├── edit.ts           # nanobanana_edit_image handler
│       ├── multi-edit.ts     # nanobanana_multi_edit_start/continue/end handlers
│       └── info.ts           # nanobanana_list_sessions, nanobanana_list_options handlers
└── dist/                     # Compiled JS output (git-ignored)
```

### File Responsibilities

| File | Responsibility |
|------|---------------|
| `src/index.ts` | Creates `McpServer`, imports all tool handlers, calls `registerTool()` for each, connects `StdioServerTransport`. No business logic here. |
| `src/types.ts` | All TypeScript interfaces for API request/response bodies, session state, tool params, and tool results. Single source of truth for type shapes. |
| `src/constants.ts` | All string constants, enum arrays, defaults, and the parameter compatibility table. Zero runtime logic. |
| `src/schemas/tool-schemas.ts` | Zod schemas for all 7 tools. Each schema has `.describe()` on every field and `.strict()` on the object. Exports both schemas and inferred types. |
| `src/services/gemini-client.ts` | Builds and sends HTTP requests to the Gemini REST API. Handles auth headers, request body assembly, error parsing. No MCP awareness. |
| `src/services/image-handler.ts` | Reads image files from disk into base64, writes base64 image data to disk, detects MIME types from file extensions, manages the output directory. |
| `src/services/session-manager.ts` | Creates, retrieves, updates, lists, and deletes multi-turn editing sessions. In-memory `Map<string, SessionState>`. Handles session timeouts. |
| `src/services/shared-utils.ts` | Prompt expansion, parameter compatibility validation, response formatting (markdown vs JSON), character limit truncation, search tool config building. |
| `src/tools/generate.ts` | Handler for `nanobanana_generate_image`. Validates params, builds prompt, calls gemini-client, saves image, returns result. |
| `src/tools/edit.ts` | Handler for `nanobanana_edit_image`. Reads source image, validates params, calls gemini-client with image+text, saves result. |
| `src/tools/multi-edit.ts` | Handlers for `nanobanana_multi_edit_start`, `nanobanana_multi_edit_continue`, `nanobanana_multi_edit_end`. Manages session lifecycle via session-manager. |
| `src/tools/info.ts` | Handlers for `nanobanana_list_sessions` and `nanobanana_list_options`. Read-only introspection tools. |

---

## Tool Specifications

### All 7 Tools

| # | Tool Name | Function | Trigger | Annotations |
|---|-----------|----------|---------|-------------|
| 1 | `nanobanana_generate_image` | Text-to-image generation | User says "draw/generate/create" with no source image | `readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true` |
| 2 | `nanobanana_edit_image` | Single image edit | User provides image + edit instruction | `readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true` |
| 3 | `nanobanana_multi_edit_start` | Start multi-turn editing session | User wants iterative refinement | `readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true` |
| 4 | `nanobanana_multi_edit_continue` | Continue within session | User adds edits to existing session | `readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true` |
| 5 | `nanobanana_multi_edit_end` | End session, free memory | User done or explicitly ends | `readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false` |
| 6 | `nanobanana_list_sessions` | List active editing sessions | User asks about in-progress work | `readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false` |
| 7 | `nanobanana_list_options` | List all models, params, scenarios | User asks what's available | `readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false` |

### Common Parameters (generate, edit, multi_edit_start)

| Parameter | Type | Default | Required | Description |
|-----------|------|---------|----------|-------------|
| `prompt` / `edit_instruction` | string | -- | Yes | What to generate or how to edit |
| `model` | enum (3 values) | `"gemini-3.1-flash-image-preview"` | No | Which Nano Banana model to use |
| `aspect_ratio` | enum (14 values) | `"1:1"` | No | Output image aspect ratio |
| `image_size` | enum (4 values) | `"1K"` | No | Output image resolution |
| `thinking_level` | enum (2 values) | `"minimal"` | No | Thinking depth: "minimal" or "High" |
| `enable_search` | boolean | `false` | No | Enable Google Search grounding |
| `enable_image_search` | boolean | `false` | No | Enable Image Search grounding (Nano Banana 2 only) |
| `response_format` | enum (2 values) | `"markdown"` | No | Output format for text content |

### Tool-Specific Parameters

| Tool | Extra Parameter | Type | Required |
|------|----------------|------|----------|
| `nanobanana_edit_image` | `source_image_path` | string | Yes |
| `nanobanana_multi_edit_start` | `source_image_path` | string | No (can start from text) |
| `nanobanana_multi_edit_continue` | `session_id` | string | Yes |
| `nanobanana_multi_edit_continue` | `edit_instruction` | string | Yes |
| `nanobanana_multi_edit_end` | `session_id` | string | Yes |

---

## Module Dependency Diagram

```
src/index.ts
├── src/schemas/tool-schemas.ts
│   └── (zod)
├── src/tools/generate.ts
│   ├── src/services/gemini-client.ts
│   │   ├── src/types.ts
│   │   ├── src/constants.ts
│   │   └── src/services/shared-utils.ts
│   ├── src/services/image-handler.ts
│   │   └── src/constants.ts
│   └── src/services/shared-utils.ts
│       ├── src/types.ts
│       └── src/constants.ts
├── src/tools/edit.ts
│   ├── src/services/gemini-client.ts
│   ├── src/services/image-handler.ts
│   └── src/services/shared-utils.ts
├── src/tools/multi-edit.ts
│   ├── src/services/gemini-client.ts
│   ├── src/services/image-handler.ts
│   ├── src/services/session-manager.ts
│   │   ├── src/types.ts
│   │   └── src/constants.ts
│   └── src/services/shared-utils.ts
└── src/tools/info.ts
    ├── src/services/session-manager.ts
    ├── src/services/shared-utils.ts
    └── src/constants.ts
```

Key rules:
- `src/index.ts` imports tools and schemas only. It never imports services directly.
- Tool handlers (`src/tools/*`) import services and constants. They never import each other.
- Services (`src/services/*`) import types, constants, and may import peer services. They never import tools.
- `src/types.ts` and `src/constants.ts` are leaf modules with zero internal imports.
- `src/schemas/tool-schemas.ts` imports only `zod` and `src/constants.ts`.

---

## Parameter Compatibility Validation Rules

The `shared-utils.ts` module must enforce these rules before sending any API request:

### Rule 1: imageSize "512" requires Nano Banana 2
```
IF image_size === "512" AND model !== "gemini-3.1-flash-image-preview"
THEN return error: "512 image size is only available with Nano Banana 2 (gemini-3.1-flash-image-preview)"
```

### Rule 2: thinkingLevel "High" excludes Nano Banana (original)
```
IF thinking_level === "High" AND model === "gemini-2.5-flash-image"
THEN return error: "High thinking level is not supported by the original Nano Banana model (gemini-2.5-flash-image)"
```

### Rule 3: Image Search requires Nano Banana 2
```
IF enable_image_search === true AND model !== "gemini-3.1-flash-image-preview"
THEN return error: "Image search grounding is only available with Nano Banana 2 (gemini-3.1-flash-image-preview)"
```

### Rule 4: Image Search implies Web Search
```
IF enable_image_search === true
THEN enable_search is implicitly true (image search config includes webSearch)
```

### Full Compatibility Table

| Parameter | Nano Banana 2 (`gemini-3.1-flash-image-preview`) | Nano Banana Pro (`gemini-3-pro-image-preview`) | Nano Banana (`gemini-2.5-flash-image`) |
|-----------|---|---|---|
| imageSize "512" | Yes | No | No |
| imageSize "1K"/"2K"/"4K" | Yes | Yes | Yes |
| thinkingLevel "High" | Yes | Yes | No |
| enable_image_search | Yes | No | No |
| enable_search | Yes | Yes | Yes |
| Multi-image refs (max) | 14 (10 object + 4 character) | 11 (6 object + 5 character) | Limited |
| All 14 aspect ratios | Yes | Yes | Yes |

---

## Prompt Optimization Guidance

When a tool receives a short or vague user prompt, `shared-utils.ts` should expand it into a detailed prompt using these dimensions:

### Expansion Dimensions
1. **Subject**: What is the main subject? Add specificity (e.g., "cat" -> "a fluffy orange tabby cat")
2. **Scene/Setting**: Where does this take place? (e.g., "on a sunlit windowsill in a cozy apartment")
3. **Lighting**: What kind of lighting? (e.g., "warm golden hour sunlight", "dramatic studio lighting")
4. **Style**: What artistic style? (e.g., "photorealistic", "watercolor illustration", "3D render")
5. **Composition**: How is the frame arranged? (e.g., "close-up portrait", "wide-angle landscape", "bird's eye view")
6. **Mood/Atmosphere**: What feeling should it evoke? (e.g., "serene and peaceful", "vibrant and energetic")
7. **Camera Details**: For photorealistic prompts (e.g., "shot on Canon EOS R5, 85mm f/1.4, shallow depth of field")
8. **Color Palette**: Dominant colors or color scheme (e.g., "warm earth tones", "neon cyberpunk palette")

### Auto-Inference Rules for Parameters

These rules guide how Claude Code should select tool parameters from user intent:

| User Intent Signal | Inferred Parameter |
|--------------------|-------------------|
| "phone wallpaper", "mobile background" | `aspect_ratio: "9:16"` |
| "desktop wallpaper", "monitor background" | `aspect_ratio: "16:9"` |
| "print poster", "high-res print" | `image_size: "4K"`, `model: "gemini-3-pro-image-preview"` |
| "quick draft", "rough sketch", "thumbnail" | `image_size: "512"`, `model: "gemini-3.1-flash-image-preview"` |
| "needs real-world data", "current events" | `enable_search: true` |
| "based on this photo style", "like these images" | `enable_image_search: true` |
| "social media post", "Instagram" | `aspect_ratio: "4:5"` |
| "YouTube thumbnail" | `aspect_ratio: "16:9"`, `image_size: "2K"` |
| "logo", "icon", "avatar" | `aspect_ratio: "1:1"` |
| "ultrawide", "cinematic banner" | `aspect_ratio: "21:9"` |
| "complex scene", "detailed illustration" | `thinking_level: "High"` |

---

## Shared Utility Functions Inventory

### `src/services/shared-utils.ts`

| Function | Signature | Purpose |
|----------|-----------|---------|
| `validateParameterCompatibility` | `(params: { model: string; image_size: string; thinking_level: string; enable_image_search: boolean }) => { valid: boolean; error?: string }` | Enforces the 4 compatibility rules above |
| `buildToolsConfig` | `(enableSearch: boolean, enableImageSearch: boolean) => GeminiSearchTool[] \| undefined` | Returns the correct `tools` array for the Gemini API request |
| `buildGenerationConfig` | `(params: { aspect_ratio: string; image_size: string; thinking_level: string }) => GenerationConfig` | Assembles `responseModalities`, `imageConfig`, and `thinkingConfig` |
| `truncateText` | `(text: string, limit?: number) => string` | Truncates text to CHARACTER_LIMIT with indicator |
| `formatErrorResponse` | `(error: unknown) => string` | Extracts an actionable message from an API error or unknown thrown value |
| `extractModelText` | `(parts: GeminiPart[]) => string` | Extracts non-thought text parts from a Gemini response |
| `extractImageData` | `(parts: GeminiPart[]) => { data: string; mimeType: string } \| null` | Finds the first non-thought inline image from response parts |
| `extractCandidateParts` | `(response: GeminiResponseBody, context: string) => { parts: GeminiPart[] } \| { error: string }` | Extracts parts from first candidate with API error and safety handling |

### `src/services/gemini-client.ts`

| Function | Signature | Purpose |
|----------|-----------|---------|
| `generateImage` | `(prompt: string, modelId: string, generationConfig: GenerationConfig, tools?: GeminiSearchTool[]) => Promise<GeminiResponseBody>` | Generates an image from a text prompt |
| `editImage` | `(imageBase64: string, mimeType: string, instruction: string, modelId: string, generationConfig: GenerationConfig, tools?: GeminiSearchTool[]) => Promise<GeminiResponseBody>` | Edits an image with a text instruction |
| `multiTurnGenerate` | `(contents: GeminiContent[], modelId: string, generationConfig: GenerationConfig, tools?: GeminiSearchTool[]) => Promise<GeminiResponseBody>` | Multi-turn generation with conversation history |
| `getApiKey` | `() => string` | Reads `GEMINI_API_KEY` from env, throws if missing |
| `buildRequestUrl` | `(modelId: string) => string` | Constructs the full endpoint URL |
| `filterThoughtParts` | `(response: GeminiResponseBody) => GeminiResponseBody` | Filters thought parts from response candidates |

### `src/services/image-handler.ts`

| Function | Signature | Purpose |
|----------|-----------|---------|
| `readImageAsBase64` | `(filePath: string) => Promise<{ data: string; mimeType: string }>` | Reads file, returns base64 string and detected MIME type |
| `saveBase64Image` | `(base64Data: string, mimeType: string, outputDir?: string) => Promise<string>` | Writes base64 data to a file in OUTPUT_DIR, returns absolute path |
| `detectMimeType` | `(filePath: string) => string` | Maps file extension to MIME type (png, jpeg, webp, gif) |
| `ensureOutputDir` | `(dir?: string) => Promise<string>` | Creates output directory if it does not exist, returns absolute path |

### `src/services/session-manager.ts`

| Function | Signature | Purpose |
|----------|-----------|---------|
| `createSession` | `(modelId: string, initialContents: GeminiContent[], generationConfig: GenerationConfig, tools?: GeminiSearchTool[]) => { sessionId: string }` | Creates a new session with UUID, stores in map |
| `getSession` | `(sessionId: string) => SessionState \| undefined` | Retrieves session, updates lastAccessedAt |
| `appendToSession` | `(sessionId: string, content: GeminiContent) => boolean` | Appends a single content message to session history |
| `deleteSession` | `(sessionId: string) => boolean` | Removes session from map |
| `listSessions` | `() => SessionSummary[]` | Returns all active (non-expired) sessions |
| `cleanupExpiredSessions` | `() => number` | Removes sessions past SESSION_TIMEOUT_MS, returns count removed |
| `ensureCleanupTimer` | `() => void` | Starts the session expiry cleanup interval (idempotent) |

---

## API Request/Response Flow

### Generate Image Flow
```
1. Claude Code calls nanobanana_generate_image with params
2. Zod schema validates input
3. validateParameterCompatibility() checks model-param combos
4. buildGenerationConfig() assembles generationConfig
5. buildSearchTools() assembles tools array (if search enabled)
6. gemini-client.generateContent() sends POST request
7. Response parsed: filter thought parts, extract image data and text
8. image-handler.saveBase64Image() writes image to disk
9. formatResponse() builds markdown or JSON output
10. Return { content: [...], structuredContent: {...} }
```

### Multi-Turn Edit Flow
```
1. multi_edit_start: create session, optionally load source image
2. Build initial contents array (user turn with text + optional image)
3. Call Gemini API, get response
4. Store full conversation (including thought_signatures) in session
5. Save generated image, return path + session_id

6. multi_edit_continue: load session by ID
7. Append new user turn to session contents
8. Call Gemini API with full conversation history
9. Append model response to session contents (preserve thought_signatures)
10. Save new image, return path

11. multi_edit_end: delete session from memory, return summary
```

### Thought Signature Preservation Rules
- When building multi-turn conversation history, include ALL parts from model responses verbatim
- This means `thought_signature` fields are preserved in the `contents` array sent back to the API
- Parts with `"thought": true` must be filtered from user-visible output but kept in session history
- Never display, modify, or strip `thought_signature` values

---

## Error Handling Strategy

| Error Source | Handling |
|-------------|----------|
| Missing GEMINI_API_KEY | Throw at startup in gemini-client.getApiKey() with clear message |
| Parameter incompatibility | Return `{ content: [...], isError: true }` with specific fix suggestion |
| Gemini 400 (safety filter) | Return error with suggestion to rephrase the prompt |
| Gemini 403 (auth) | Return error indicating invalid or expired API key |
| Gemini 429 (rate limit) | Return error with suggestion to wait and retry |
| Gemini 500/503 (server) | Return error indicating temporary server issue |
| File not found (source image) | Return error with the path that was not found |
| Invalid MIME type | Return error listing supported types: png, jpeg, webp, gif |
| Session not found | Return error with suggestion to list sessions or start new one |
| Session expired | Return error indicating timeout, suggest starting new session |
| Response too long | Truncate with truncateText() and indicator |
