// =============================================================================
// nanobanana-mcp-server — Zod Schemas for All 7 Tools
// =============================================================================

import { z } from "zod";
import {
  MODEL_ID_VALUES,
  SUPPORTED_ASPECT_RATIOS,
  SUPPORTED_IMAGE_SIZES,
  SUPPORTED_THINKING_LEVELS,
  SUPPORTED_RESPONSE_FORMATS,
  DEFAULT_MODEL,
  DEFAULT_ASPECT_RATIO,
  DEFAULT_IMAGE_SIZE,
  DEFAULT_THINKING_LEVEL,
  DEFAULT_RESPONSE_FORMAT,
} from "../constants.js";

// -----------------------------------------------------------------------------
// Shared Field Builders
// -----------------------------------------------------------------------------

const modelField = z
  .enum(MODEL_ID_VALUES)
  .default(DEFAULT_MODEL)
  .describe(
    "Which Nano Banana model to use. " +
    "'gemini-3.1-flash-image-preview' (Nano Banana 2): fast, 4K, 512 support, High thinking, image search, up to 14 ref images. Best for speed, high-volume generation, and quick iteration. " +
    "'gemini-3-pro-image-preview' (Nano Banana Pro): premium, built-in always-on thinking, up to 11 ref images, 9 aspect ratios only (no extreme ratios like 1:4, 1:8, 4:1, 8:1, 21:9). Best for complex compositions, faithful text rendering, and photorealistic scenes. " +
    "AUTO-INFERENCE: speed/volume/thumbnails/drafts -> Nano Banana 2, complex scene/text rendering/photorealism -> Nano Banana Pro. " +
    "Default: gemini-3.1-flash-image-preview."
  );

const aspectRatioField = z
  .enum(SUPPORTED_ASPECT_RATIOS)
  .default(DEFAULT_ASPECT_RATIO)
  .describe(
    "Aspect ratio of the generated image. " +
    "Auto-inference guide: phone wallpaper -> '9:16', desktop wallpaper -> '16:9', " +
    "Instagram post -> '4:5', YouTube thumbnail -> '16:9', logo/icon/avatar -> '1:1', " +
    "ultrawide/cinematic -> '21:9', portrait photo -> '2:3' or '3:4', " +
    "landscape photo -> '3:2' or '4:3'. " +
    "All 14 options: 1:1, 1:4, 1:8, 2:3, 3:2, 3:4, 4:1, 4:3, 4:5, 5:4, 8:1, 9:16, 16:9, 21:9 (Nano Banana 2). " +
    "Nano Banana Pro supports 9 only: 1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9. " +
    "Default: '1:1'."
  );

const imageSizeField = z
  .enum(SUPPORTED_IMAGE_SIZES)
  .default(DEFAULT_IMAGE_SIZE)
  .describe(
    "Resolution tier for the output image. " +
    "'512': fast drafts/thumbnails (Nano Banana 2 only). " +
    "'1K': standard quality, good for most uses. " +
    "'2K': high quality for detailed images. " +
    "'4K': maximum quality for print/large display. " +
    "Auto-inference: quick draft/thumbnail -> '512', standard use -> '1K', " +
    "detailed work -> '2K', print poster/high-res -> '4K'. " +
    "Note: '512' only works with model 'gemini-3.1-flash-image-preview'. " +
    "Values are case-sensitive: use '1K', not '1k'. " +
    "Default: '1K'."
  );

const thinkingLevelField = z
  .enum(SUPPORTED_THINKING_LEVELS)
  .default(DEFAULT_THINKING_LEVEL)
  .describe(
    "How much internal reasoning the model uses before generating. " +
    "'minimal': faster, suitable for straightforward prompts. " +
    "'High': deeper reasoning for complex scenes, detailed compositions, or text rendering. " +
    "Note: 'High' is only configurable on 'gemini-3.1-flash-image-preview' (Nano Banana 2). " +
    "Nano Banana Pro has built-in always-on thinking (do not set 'High' for Pro). " +
    "Auto-inference: complex scene or detailed illustration -> 'High' (with Nano Banana 2). " +
    "Default: 'minimal'."
  );

const enableSearchField = z
  .boolean()
  .default(false)
  .describe(
    "Enable Google Search grounding to incorporate real-world data into image generation. " +
    "Useful when the prompt references current events, real places, real products, or needs factual accuracy. " +
    "Auto-inference: any mention of real-world data, current events, or specific real entities -> true. " +
    "Default: false."
  );

const enableImageSearchField = z
  .boolean()
  .default(false)
  .describe(
    "Enable Google Image Search grounding for visual reference from the web. " +
    "Only available with model 'gemini-3.1-flash-image-preview' (Nano Banana 2). " +
    "Useful when the user wants to base the output on a particular visual style or real-world appearance. " +
    "Enabling this implicitly enables web search as well. " +
    "Auto-inference: 'based on this photo style' or 'like these images' -> true. " +
    "Default: false."
  );

const responseFormatField = z
  .enum(SUPPORTED_RESPONSE_FORMATS)
  .default(DEFAULT_RESPONSE_FORMAT)
  .describe(
    "Output format for the text portion of the response. " +
    "'markdown': human-friendly formatted text with image path. " +
    "'json': machine-readable JSON object with all metadata. " +
    "Default: 'markdown'."
  );

// =============================================================================
// Tool 1: nanobanana_generate_image
// =============================================================================

export const GenerateImageSchema = z
  .object({
    prompt: z
      .string()
      .min(1, "Prompt must not be empty")
      .max(32000, "Prompt exceeds maximum length")
      .describe(
        "Detailed description of the image to generate. " +
        "PROMPT OPTIMIZATION: Expand short user requests into rich prompts covering: " +
        "subject (specific details), scene/setting, lighting (e.g., 'golden hour', 'studio'), " +
        "style (e.g., 'photorealistic', 'watercolor', '3D render'), " +
        "composition (e.g., 'close-up', 'wide-angle', 'bird's eye'), " +
        "mood/atmosphere, camera details for photorealistic (e.g., 'Canon EOS R5, 85mm f/1.4'), " +
        "and color palette. Example: user says 'a cat' -> expand to " +
        "'A fluffy orange tabby cat sitting on a sunlit windowsill, warm golden hour lighting, " +
        "photorealistic style, shallow depth of field, cozy apartment setting, peaceful mood'."
      ),
    model: modelField,
    aspect_ratio: aspectRatioField,
    image_size: imageSizeField,
    thinking_level: thinkingLevelField,
    enable_search: enableSearchField,
    enable_image_search: enableImageSearchField,
    response_format: responseFormatField,
  })
  .strict();

// =============================================================================
// Tool 2: nanobanana_edit_image
// =============================================================================

export const EditImageSchema = z
  .object({
    edit_instruction: z
      .string()
      .min(1, "Edit instruction must not be empty")
      .max(32000, "Edit instruction exceeds maximum length")
      .describe(
        "Description of how to edit the source image. " +
        "Be specific about what to change: 'change the background to a beach sunset', " +
        "'add a party hat to the cat', 'make the colors more vibrant', " +
        "'remove the person on the left', 'convert to pencil sketch style'. " +
        "PROMPT OPTIMIZATION: Expand vague instructions into specific edits. " +
        "Example: 'make it better' -> 'enhance colors, improve lighting contrast, " +
        "sharpen details, and add subtle warm toning'."
      ),
    source_image_path: z
      .string()
      .min(1, "Source image path must not be empty")
      .describe(
        "Absolute file path to the source image to edit. " +
        "Supported formats: PNG (.png), JPEG (.jpg, .jpeg), WebP (.webp), GIF (.gif). " +
        "The file must exist and be readable."
      ),
    model: modelField,
    aspect_ratio: aspectRatioField,
    image_size: imageSizeField,
    thinking_level: thinkingLevelField,
    enable_search: enableSearchField,
    enable_image_search: enableImageSearchField,
    response_format: responseFormatField,
  })
  .strict();

// =============================================================================
// Tool 3: nanobanana_multi_edit_start
// =============================================================================

export const MultiEditStartSchema = z
  .object({
    prompt: z
      .string()
      .min(1, "Prompt must not be empty")
      .max(32000, "Prompt exceeds maximum length")
      .describe(
        "Initial prompt for the multi-turn editing session. " +
        "This can be a text-to-image prompt (if no source_image_path) or an edit instruction " +
        "(if a source image is provided). The session will preserve full conversation history " +
        "for iterative refinement. " +
        "PROMPT OPTIMIZATION: Same rules as generate — expand into detailed descriptions."
      ),
    source_image_path: z
      .string()
      .min(1, "Source image path must not be empty")
      .optional()
      .describe(
        "Optional absolute file path to a source image to start editing from. " +
        "If omitted, the session starts with text-to-image generation. " +
        "If provided, the session starts with an edit of this image. " +
        "Supported formats: PNG, JPEG, WebP, GIF."
      ),
    model: modelField,
    aspect_ratio: aspectRatioField,
    image_size: imageSizeField,
    thinking_level: thinkingLevelField,
    enable_search: enableSearchField,
    enable_image_search: enableImageSearchField,
    response_format: responseFormatField,
  })
  .strict();

// =============================================================================
// Tool 4: nanobanana_multi_edit_continue
// =============================================================================

export const MultiEditContinueSchema = z
  .object({
    session_id: z
      .string()
      .min(1, "Session ID must not be empty")
      .describe(
        "The session ID returned by nanobanana_multi_edit_start. " +
        "Use nanobanana_list_sessions to see active sessions if the ID is unknown."
      ),
    edit_instruction: z
      .string()
      .min(1, "Edit instruction must not be empty")
      .max(32000, "Edit instruction exceeds maximum length")
      .describe(
        "Description of the next edit to apply to the session's current image. " +
        "The full conversation history (all previous turns) is sent to the model, " +
        "so the instruction can reference previous changes. " +
        "Examples: 'now make the background blue', 'add more detail to the foreground', " +
        "'undo the last color change and try a warmer palette instead'."
      ),
  })
  .strict();

// =============================================================================
// Tool 5: nanobanana_multi_edit_end
// =============================================================================

export const MultiEditEndSchema = z
  .object({
    session_id: z
      .string()
      .min(1, "Session ID must not be empty")
      .describe(
        "The session ID to end. This frees the in-memory conversation history. " +
        "All previously saved images remain on disk. " +
        "Use nanobanana_list_sessions to find active session IDs."
      ),
  })
  .strict();

// =============================================================================
// Tool 6: nanobanana_list_sessions
// =============================================================================

export const ListSessionsSchema = z.object({}).strict();

// =============================================================================
// Tool 7: nanobanana_list_options
// =============================================================================

export const ListOptionsSchema = z.object({}).strict();

// =============================================================================
// Tool Descriptions (for registerTool)
// =============================================================================

export const TOOL_DESCRIPTIONS = {
  nanobanana_generate_image: `Generate an image from a text description using Google's Nano Banana (Gemini Image) API.

WHEN TO USE: When the user wants to create a new image from scratch. Trigger words: "draw", "generate", "create", "make an image", "picture of", "illustration of". Do NOT use this if the user provides a source image to edit (use nanobanana_edit_image instead) or wants iterative refinement (use nanobanana_multi_edit_start).

PROMPT OPTIMIZATION: Always expand short user requests into detailed prompts. Cover: subject (with specifics), scene/setting, lighting, artistic style, composition, mood/atmosphere, and camera details for photorealistic images. Example: "a dog" -> "A golden retriever puppy playing in a field of wildflowers, soft afternoon sunlight, photorealistic, shallow depth of field, joyful and energetic mood, shot with a 50mm lens".

AUTO-INFERENCE RULES:
- Phone wallpaper -> aspect_ratio: "9:16"
- Desktop wallpaper -> aspect_ratio: "16:9"
- Print poster / high-res -> image_size: "4K", model: "gemini-3-pro-image-preview"
- Quick draft / thumbnail -> image_size: "512"
- Real-world data needed -> enable_search: true
- Complex scene -> thinking_level: "High"
- Instagram post -> aspect_ratio: "4:5"
- Logo / icon / avatar -> aspect_ratio: "1:1"

Returns: The saved image file path and any text the model generated alongside the image.`,

  nanobanana_edit_image: `Edit an existing image using a text instruction via Google's Nano Banana (Gemini Image) API.

WHEN TO USE: When the user provides a specific source image file and wants to modify it. The user must provide both an image path and an edit instruction. Do NOT use this for creating images from scratch (use nanobanana_generate_image) or for iterative multi-step editing (use nanobanana_multi_edit_start).

PROMPT OPTIMIZATION: Be specific about edits. Expand vague requests: "make it better" -> "enhance color vibrancy, improve lighting contrast, sharpen fine details, and apply subtle warm color grading".

AUTO-INFERENCE RULES: Same as generate_image for model, aspect_ratio, image_size, thinking_level, and search settings.

Returns: The saved edited image file path and any text the model generated.`,

  nanobanana_multi_edit_start: `Start a multi-turn image editing session for iterative refinement.

WHEN TO USE: When the user wants to make multiple rounds of changes to an image, refining it step by step. Use this instead of nanobanana_edit_image when the user signals iterative intent: "let's work on this", "I'll want to tweak it", "start an editing session", or when the task clearly requires multiple rounds of changes.

Do NOT use this for a single one-shot edit where the user does not need iterative refinement (use nanobanana_edit_image instead).

Can start from:
1. Text only (no source_image_path): generates an initial image, then allows edits
2. Source image + prompt: applies first edit, then allows further edits

The session preserves full conversation history including thought_signatures for optimal multi-turn results.

PROMPT OPTIMIZATION: Same rules as generate_image for the initial prompt.

Sessions expire after 30 minutes of inactivity.

Returns: Session ID (needed for continue/end calls), saved image path, and model text.`,

  nanobanana_multi_edit_continue: `Continue editing within an active multi-turn session.

WHEN TO USE: After nanobanana_multi_edit_start has created a session. The user provides a new edit instruction and the session ID. The full conversation history is sent to the model, enabling context-aware edits that can reference previous changes.

Examples of good edit instructions:
- "now change the background to a sunset"
- "make the text larger and bolder"
- "undo the color change and try a cooler palette"
- "add more detail to the character's face"

Returns: Updated image path, turn count, and any model text.`,

  nanobanana_multi_edit_end: `End a multi-turn editing session and free its memory.

WHEN TO USE: When the user is done editing and wants to close the session, or when they explicitly say "done", "finish", "end session". All previously saved images remain on disk — only the in-memory conversation history is freed.

Returns: Session summary with total turns completed.`,

  nanobanana_list_sessions: `List all active multi-turn editing sessions.

WHEN TO USE: When the user asks about in-progress editing work, wants to find a session ID, or asks "what sessions are active". Also useful before multi_edit_continue if the session ID is unknown.

Returns: List of active sessions with IDs, models, turn counts, and timestamps.`,

  nanobanana_list_options: `List all available models, parameters, and their compatibility.

WHEN TO USE: When the user asks "what models are available", "what options do I have", "what aspect ratios are supported", or needs guidance on parameter selection. Also useful for understanding which features work with which models.

Returns: Complete list of models (with feature flags), aspect ratios, image sizes, thinking levels, and the full parameter compatibility matrix.`,
} as const;
