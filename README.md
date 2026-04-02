# nanobanana-mcp-server

MCP server for AI image generation and editing via Google's Nano Banana (Gemini Image) API. Lets Claude Code users generate images from text, edit existing images, and run multi-turn iterative refinement sessions.

## Prerequisites

- **Node.js 18+**
- **Gemini API Key** from [Google AI Studio](https://aistudio.google.com/apikey)

## Install

```bash
cd nanobanana-mcp-server
npm install
npm run build
```

## Register in Claude Code

**Local scope** (current project only):
```bash
claude mcp add nanobanana -e GEMINI_API_KEY=your-key -- node /absolute/path/nanobanana-mcp-server/dist/index.js
```

**User scope** (all projects):
```bash
claude mcp add nanobanana --scope user -e GEMINI_API_KEY=your-key -- node /absolute/path/nanobanana-mcp-server/dist/index.js
```

## Tools

### nanobanana_generate_image
Text-to-image generation. Use when the user says "draw", "generate", or "create" with no source image.

```
"Generate a photorealistic sunset over mountains"
"Draw a cartoon cat wearing a top hat, phone wallpaper" → auto-infers 9:16
```

### nanobanana_edit_image
Edit an existing image with a text instruction. Requires `source_image_path`.

```
"Change the background to a beach sunset" (with source image)
"Remove the person on the left and fill in the background"
```

### nanobanana_multi_edit_start
Start an iterative editing session for multi-turn refinement. Optionally provide a source image.

```
"Start a logo design session for a coffee shop called Bean There"
```

### nanobanana_multi_edit_continue
Continue refining within an active session. Preserves full conversation history.

```
"Make the coffee cup bigger and use earth tones"
```

### nanobanana_multi_edit_end
End a session and free memory.

```
"End the current editing session" (with session_id from multi_edit_start)
```

### nanobanana_list_sessions
List all active multi-edit sessions with metadata.

```
"What editing sessions do I have open?"
```

### nanobanana_list_options
List all available models, parameters, aspect ratios, and compatibility info.

```
"What models and options are available for image generation?"
```

## Parameters

| Parameter | Values | Default | Notes |
|---|---|---|---|
| `model` | `gemini-3.1-flash-image-preview`, `gemini-3-pro-image-preview`, `gemini-2.5-flash-image` | `gemini-3.1-flash-image-preview` | Nano Banana 2 (fast), Pro (premium), Original |
| `aspect_ratio` | `1:1`, `1:4`, `1:8`, `2:3`, `3:2`, `3:4`, `4:1`, `4:3`, `4:5`, `5:4`, `8:1`, `9:16`, `16:9`, `21:9` | `1:1` | 14 options |
| `image_size` | `512`, `1K`, `2K`, `4K` | `1K` | `512` = Nano Banana 2 only. Uppercase K required |
| `thinking_level` | `minimal`, `High` | `minimal` | `High` not available on original Nano Banana |
| `enable_search` | `true`, `false` | `false` | Google Search grounding for real-world data |
| `enable_image_search` | `true`, `false` | `false` | Image search grounding (Nano Banana 2 only) |
| `response_format` | `markdown`, `json` | `markdown` | Output format |

### Tool-Specific Parameters

| Parameter | Tool(s) | Type | Required | Description |
|---|---|---|---|---|
| `prompt` | `generate_image`, `multi_edit_start` | string | Yes | Text description of the image to generate |
| `edit_instruction` | `edit_image`, `multi_edit_continue` | string | Yes | Description of how to edit the image |
| `source_image_path` | `edit_image` | string | Yes | Absolute path to the source image file (.png, .jpg, .jpeg, .webp, .gif) |
| `source_image_path` | `multi_edit_start` | string | No | Optional source image to start editing from |
| `session_id` | `multi_edit_continue`, `multi_edit_end` | string | Yes | Session ID returned by `multi_edit_start` |

### Model Compatibility

| Feature | Nano Banana 2 | Nano Banana Pro | Nano Banana |
|---|---|---|---|
| Model ID | `gemini-3.1-flash-image-preview` | `gemini-3-pro-image-preview` | `gemini-2.5-flash-image` |
| imageSize "512" | Yes | No | No |
| thinkingLevel "High" | Yes | Yes | No |
| Image Search | Yes | No | No |
| Max ref images | 14 | 11 | 5 |

## Auto-Inference Rules

Claude automatically infers optimal parameters from context:
- "phone wallpaper" → aspect_ratio `9:16`
- "desktop wallpaper" → aspect_ratio `16:9`
- "print poster" → image_size `4K` + Nano Banana Pro
- "quick draft" → image_size `512`
- "real-world data" → enable_search `true`
- "Instagram post" → aspect_ratio `4:5`

## Output

Generated images are saved to `nanobanana-output/` in the current working directory with filenames like `1711929600000-a3f2.png`.

## Evaluation

10 QA pairs in `evaluation.xml` test tool selection, parameter inference, error handling, and multi-turn workflows. These do not call the API — they verify an LLM can correctly use the tools.

## License

MIT
