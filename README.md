# claude-nanobanana-mcp

MCP server for AI image generation and editing via Google's Nano Banana (Gemini Image) API. Provides 7 tools that let Claude Code generate images from text, edit existing images, and run multi-turn iterative refinement sessions.

> This project was entirely developed, debugged, and tested by [Claude Code](https://claude.ai/claude-code) (Claude Opus 4.6). No human-written code.

| Generate | Edit | Multi-Edit | Ultrawide |
|:---:|:---:|:---:|:---:|
| ![generate](tests/examples/generate-apple.png) | ![edit](tests/examples/edit-green-apple.png) | ![multi](tests/examples/multi-edit-2-smiley.png) | ![wide](tests/examples/ultrawide-21-9.png) |
| Text-to-image | Single-shot edit | Iterative session | 21:9 cinematic |

## Quick Start

### Prerequisites

- **Node.js 18+**
- **Gemini API Key** — free from [Google AI Studio](https://aistudio.google.com/apikey)

### Install

```bash
git clone https://github.com/1439616687/claude-nanobanana-mcp.git
cd claude-nanobanana-mcp
npm install
npm run build
```

### Register in Claude Code

**User scope** (available in all projects):

```bash
claude mcp add nanobanana --scope user \
  -e GEMINI_API_KEY=your-key-here \
  -- node /absolute/path/to/claude-nanobanana-mcp/dist/index.js
```

**Local scope** (current project only):

```bash
claude mcp add nanobanana \
  -e GEMINI_API_KEY=your-key-here \
  -- node /absolute/path/to/claude-nanobanana-mcp/dist/index.js
```

> Replace `/absolute/path/to/` with the actual path where you cloned the repo.

### Verify

After registering, **restart your Claude Code session**, then ask:

```
What image generation tools are available?
```

Claude should respond with the 7 nanobanana tools. If not, run `claude mcp list` to check the connection status.

### Uninstall

```bash
claude mcp remove nanobanana          # local scope
claude mcp remove nanobanana --scope user  # user scope
```

## Tools

| Tool | Purpose | API Call | Description |
|------|---------|:---:|-------------|
| `nanobanana_generate_image` | Text-to-image | Yes | Generate a new image from a text description |
| `nanobanana_edit_image` | Edit image | Yes | Modify an existing image with a text instruction |
| `nanobanana_multi_edit_start` | Start session | Yes | Begin an iterative editing session (from text or image) |
| `nanobanana_multi_edit_continue` | Continue session | Yes | Apply next edit within an active session |
| `nanobanana_multi_edit_end` | End session | No | Close session and free memory |
| `nanobanana_list_sessions` | List sessions | No | Show all active editing sessions |
| `nanobanana_list_options` | List options | No | Show models, parameters, and compatibility |

### When to Use Which Tool

| User Request | Tool |
|---|---|
| "Draw a cat" / "Generate a sunset" | `generate_image` |
| "Make this photo black and white" (with a file) | `edit_image` |
| "Let's design a logo step by step" | `multi_edit_start` → `continue` → `end` |
| "What models are available?" | `list_options` |

### Usage Examples

Just tell Claude what you want in natural language:

```
"Draw a cartoon cat wearing a top hat as a phone wallpaper"
  → Claude auto-infers: generate_image, aspect_ratio 9:16, NB2

"Change this image to look like an oil painting"
  → Claude uses: edit_image with source_image_path

"I want to design a coffee shop logo, let's iterate"
  → Claude starts: multi_edit_start, then continue for each round

"Make it a 4K print poster with a cinematic feel"
  → Claude auto-infers: image_size 4K, aspect_ratio 21:9
```

## Models

### Nano Banana 2 (`gemini-3.1-flash-image-preview`)

The fast, versatile model. Best for most use cases.

- 4 resolution tiers: 512, 1K, 2K, 4K
- All 14 aspect ratios
- Configurable thinking (minimal / High)
- Google Search + Image Search grounding
- Up to 14 reference images (10 objects + 4 characters)

### Nano Banana Pro (`gemini-3-pro-image-preview`)

The premium model for complex compositions and faithful text rendering.

- 3 resolution tiers: 1K, 2K, 4K (no 512)
- 9 aspect ratios: 1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9
- Built-in always-on thinking (not configurable)
- Google Search grounding only (no Image Search)
- Up to 11 reference images (6 objects + 5 characters)

### Model Comparison

| Feature | Nano Banana 2 | Nano Banana Pro |
|---|:---:|:---:|
| Model ID | `gemini-3.1-flash-image-preview` | `gemini-3-pro-image-preview` |
| Speed | Fast | Slower, higher quality |
| Resolution 512 | Yes | No |
| Configurable thinking | Yes (minimal / High) | No (always on) |
| Image Search grounding | Yes | No |
| Aspect ratios | All 14 | 9 (no 1:4, 1:8, 4:1, 8:1, 21:9) |
| Max reference images | 14 | 11 |

### How to Choose

| Scenario | Recommended Model |
|---|---|
| Quick drafts, thumbnails, iteration | Nano Banana 2 |
| High-volume generation | Nano Banana 2 |
| Complex compositions | Nano Banana Pro |
| Faithful text rendering | Nano Banana Pro |
| Photorealistic scenes | Nano Banana Pro |
| Extreme aspect ratios (panorama, tall banner) | Nano Banana 2 |

## Parameters

### Common Parameters

All generation and editing tools share these parameters:

| Parameter | Values | Default | Notes |
|---|---|---|---|
| `model` | `gemini-3.1-flash-image-preview`, `gemini-3-pro-image-preview` | NB2 | See [Models](#models) for differences |
| `aspect_ratio` | 14 options (NB2) / 9 options (Pro) | `1:1` | See [Aspect Ratios](#aspect-ratios) |
| `image_size` | `512`, `1K`, `2K`, `4K` | `1K` | 512 = NB2 only. Case-sensitive (use `1K` not `1k`) |
| `thinking_level` | `minimal`, `High` | `minimal` | High = NB2 only. Pro has built-in thinking |
| `enable_search` | `true`, `false` | `false` | Google Search grounding for real-world accuracy |
| `enable_image_search` | `true`, `false` | `false` | Image search grounding (NB2 only) |
| `response_format` | `markdown`, `json` | `markdown` | Output format for the text portion |

### Tool-Specific Parameters

| Parameter | Tool(s) | Type | Required |
|---|---|---|---|
| `prompt` | `generate_image`, `multi_edit_start` | string | Yes |
| `edit_instruction` | `edit_image`, `multi_edit_continue` | string | Yes |
| `source_image_path` | `edit_image` | string | Yes |
| `source_image_path` | `multi_edit_start` | string | No (omit for text-to-image) |
| `session_id` | `multi_edit_continue`, `multi_edit_end` | string | Yes |

### Aspect Ratios

| Ratio | Use Case | NB2 | Pro |
|---|---|:---:|:---:|
| `1:1` | Logo, icon, avatar, social media | Yes | Yes |
| `2:3` | Portrait photo | Yes | Yes |
| `3:2` | Landscape photo | Yes | Yes |
| `3:4` | Portrait, book cover | Yes | Yes |
| `4:3` | Classic landscape, presentation | Yes | Yes |
| `4:5` | Instagram post | Yes | Yes |
| `5:4` | Slightly wide still life | Yes | Yes |
| `9:16` | Phone wallpaper, Stories, Reels | Yes | Yes |
| `16:9` | Desktop wallpaper, YouTube thumbnail | Yes | Yes |
| `1:4` | Tall banner, bookmark | Yes | No |
| `1:8` | Extreme vertical | Yes | No |
| `4:1` | Wide banner | Yes | No |
| `8:1` | Ultra-wide panorama | Yes | No |
| `21:9` | Cinematic ultrawide | Yes | No |

### Auto-Inference

Claude automatically selects optimal parameters from context — you don't need to specify them manually:

| User Says | Claude Infers |
|---|---|
| "phone wallpaper" | `aspect_ratio: "9:16"` |
| "desktop wallpaper" | `aspect_ratio: "16:9"` |
| "YouTube thumbnail" | `aspect_ratio: "16:9"`, `image_size: "2K"` |
| "Instagram post" | `aspect_ratio: "4:5"` |
| "logo" / "icon" / "avatar" | `aspect_ratio: "1:1"` |
| "ultrawide" / "cinematic" | `aspect_ratio: "21:9"` |
| "print poster" / "high-res" | `image_size: "4K"` |
| "quick draft" / "thumbnail" | `image_size: "512"` |
| "complex scene" / "detailed" | `thinking_level: "High"` |
| Real places / current events | `enable_search: true` |
| Visual style reference | `enable_image_search: true` |
| Text rendering / photorealism | `model: Pro` |

## Prompt Guide

### Golden Rule

> **Describe the scene as a narrative paragraph, not a keyword list.** The model's core strength is deep language understanding. A descriptive paragraph always produces better results than disconnected words.

### Prompt Templates

> Templates sourced from [Google's official Gemini image generation documentation](https://ai.google.dev/gemini-api/docs/image-generation).

Claude has built-in templates for common categories. You can also use these directly:

**Photorealistic:**
```
A photorealistic [shot type] of [subject], [action/expression], set in [environment].
Illuminated by [lighting], creating a [mood] atmosphere.
Captured with a [camera/lens], emphasizing [key textures/details].
```

**Sticker / Icon:**
```
A [style] sticker of [subject], featuring [characteristics] and a [color palette].
The design has [line style] and [shading]. The background must be white.
```

**Product / Commercial:**
```
A photo of [product] on [surface]. [Lighting description].
[Brand/text integration details]. [Magazine/ad context if applicable].
```

**Infographic:**
```
Create a [style] infographic explaining [topic] as [creative analogy].
Show [elements]. Style like [reference], suitable for [audience].
```

**Isometric 3D:**
```
A 45 degree top-down isometric miniature 3D [style] scene of [location],
featuring [landmarks/elements]. Soft refined textures with PBR materials
and gentle lighting. [Title text] in bold at top-center.
```

**Scientific / Technical:**
```
[Artist/style reference] style [illustration type] of [subject].
Detailed drawings of [components] on [medium texture] with notes in [language].
```

**Text / Typography:**
```
[Format] with the text "[exact text]" in [font style].
[Placement and sizing details]. [Additional design elements].
```

### Edit Templates

**Style transfer:** `Convert this to [style] with [specific characteristics]`

**Background change:** `Replace the background with [environment], keeping the [subject] unchanged`

**Object add/remove:** `Add [object] at [position]` / `Remove [object] and fill naturally`

**Localization:** `Update this to be in [language]. Do not change any other elements.`

**Brand integration:** `Put this logo on [product/context]. The logo is perfectly integrated into [surface].`

### Important Notes

- **Transparent backgrounds are NOT supported** — use "white background" or a solid color
- For text rendering, be explicit about exact text content, font style, placement, and size
- For stickers/icons, always specify "background must be white"
- Claude can handle requests outside these templates by combining the 9-step strategy: subject, setting, lighting, style, composition, mood, camera, color palette, text

## Output

Generated images are saved to `nanobanana-output/` in the current working directory.

Filenames use the format `{timestamp}-{random}.png`, e.g., `1711929600000-a3f2.png`.

Supported input formats for editing: PNG, JPEG, WebP, GIF.

## Architecture

```
src/
├── index.ts              # MCP server init, 7 tool registrations, StdioServerTransport
├── types.ts              # All TypeScript interfaces (Gemini API types, session state, tool results)
├── constants.ts          # Model IDs, enums, defaults, compatibility table
├── schemas/
│   └── tool-schemas.ts   # Zod schemas with Google prompt templates in .describe()
├── services/
│   ├── gemini-client.ts  # HTTP client for Gemini REST API (generate, edit, multiTurn)
│   ├── image-handler.ts  # Read/write images to disk as base64, MIME detection
│   ├── session-manager.ts# In-memory session store (Map) with 30min auto-expiry
│   └── shared-utils.ts   # Parameter validation (5 rules), config builders, response extraction
└── tools/
    ├── generate.ts       # nanobanana_generate_image handler
    ├── edit.ts           # nanobanana_edit_image handler
    ├── multi-edit.ts     # multi_edit_start/continue/end handlers
    └── info.ts           # list_sessions, list_options handlers
```

### Key Design Decisions

- **Raw fetch instead of SDK** — full control over request shaping, no `@google/genai` dependency
- **Thought signature preservation** — multi-turn sessions store all model response parts (including `thoughtSignature` tokens) for optimal API continuity
- **Session-safe error handling** — user turns are only appended to session history after successful API response, preventing session corruption on failures
- **Google prompt templates embedded in schemas** — Claude Code sees the templates on every tool call via Zod `.describe()` fields

## Testing

Comprehensive testing was performed across 4 rounds with parallel Agent teams. See [`tests/TESTING.md`](tests/TESTING.md) for the full report with per-test results.

| Metric | Value |
|---|---|
| Total test cases | 65 |
| Passed | 63 |
| Known API limitations found | 2 (fixed) |
| Test coverage | 100% of parameters, models, and major scenarios |
| Total API calls | ~80 |

## Troubleshooting

| Problem | Solution |
|---|---|
| `GEMINI_API_KEY environment variable is not set` | Ensure the key is passed via `-e GEMINI_API_KEY=...` in the `claude mcp add` command |
| `Failed to connect` in `claude mcp list` | Verify the path to `dist/index.js` is correct and `npm run build` was run |
| Tools not appearing after registration | Restart your Claude Code session (exit and re-enter) |
| `Image size "512" is only available with Nano Banana 2` | Switch to model `gemini-3.1-flash-image-preview` or use 1K/2K/4K |
| `Aspect ratio "X" is not supported by Nano Banana Pro` | Pro supports 9 ratios only. Switch to NB2 for extreme ratios (1:4, 1:8, 4:1, 8:1, 21:9) |
| `Thinking level "High" is only configurable on Nano Banana 2` | Pro has built-in thinking. Use NB2 if you need explicit High thinking |
| `Image file not found` | Provide an absolute path to the source image |
| `Unsupported image format` | Supported: .png, .jpg, .jpeg, .webp, .gif |
| `Session not found` | Session may have expired (30min timeout). Start a new one |
| `fetch failed` | Transient network error. Retry the request |

## Built with Claude Code

This entire project was created through human-AI collaboration using [Claude Code](https://claude.ai/claude-code) (Claude Opus 4.6):

- **Architecture & Implementation**: Designed and coded from scratch — 12 TypeScript source files, ~1500 lines
- **Code Review & Bug Fixes**: Identified and fixed 7 bugs including session corruption, API field naming mismatch (camelCase vs snake_case), and premature thought-part filtering
- **API Verification**: Discovered 2 undocumented Gemini API constraints (Pro doesn't support High thinking or extreme aspect ratios) through systematic testing
- **Prompt Engineering**: Integrated Google's official prompt templates directly into tool schemas
- **Testing**: 65 test cases executed via parallel Agent teams simulating casual users, power users, and designers
- **Documentation**: All documentation authored by Claude, verified against Google's official Gemini API docs

## License

MIT
