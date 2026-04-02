// =============================================================================
// nanobanana-mcp-server — Constants
// =============================================================================

// -----------------------------------------------------------------------------
// API Configuration
// -----------------------------------------------------------------------------

/** Base URL for the Gemini REST API (v1beta). */
export const API_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/models" as const;

// -----------------------------------------------------------------------------
// Model IDs
// -----------------------------------------------------------------------------

export const MODEL_IDS = {
  /** Nano Banana 2: Fast, high-volume, 4K support, text rendering, up to 14 ref images. */
  NANO_BANANA_2: "gemini-3.1-flash-image-preview",
  /** Nano Banana Pro: Premium, high-fidelity text, complex compositions. */
  NANO_BANANA_PRO: "gemini-3-pro-image-preview",
} as const;

/** All valid model IDs as a tuple for Zod enum construction. */
export const MODEL_ID_VALUES = [
  MODEL_IDS.NANO_BANANA_2,
  MODEL_IDS.NANO_BANANA_PRO,
] as const;

// -----------------------------------------------------------------------------
// Parameter Enums
// -----------------------------------------------------------------------------

/** All supported aspect ratios. */
export const SUPPORTED_ASPECT_RATIOS = [
  "1:1",
  "1:4",
  "1:8",
  "2:3",
  "3:2",
  "3:4",
  "4:1",
  "4:3",
  "4:5",
  "5:4",
  "8:1",
  "9:16",
  "16:9",
  "21:9",
] as const;

/** All supported image size tiers. "512" is Nano Banana 2 only. */
export const SUPPORTED_IMAGE_SIZES = ["512", "1K", "2K", "4K"] as const;

/** Supported thinking levels. Note: "High" is capitalized per API spec. */
export const SUPPORTED_THINKING_LEVELS = ["minimal", "High"] as const;

/** Supported response formats for tool output. */
export const SUPPORTED_RESPONSE_FORMATS = ["markdown", "json"] as const;

// -----------------------------------------------------------------------------
// Parameter Compatibility Table
// -----------------------------------------------------------------------------

/**
 * Defines which features are supported by each model.
 * Used by validateParameterCompatibility() in shared-utils.ts.
 */
/** Aspect ratios supported by Nano Banana Pro (subset of all 14). */
export const PRO_SUPPORTED_ASPECT_RATIOS: readonly string[] = [
  "1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9",
] as const;

export const PARAMETER_COMPATIBILITY: Record<
  string,
  {
    imageSize512: boolean;
    thinkingConfigurable: boolean;
    imageSearch: boolean;
    maxRefImages: number;
    allAspectRatios: boolean;
  }
> = {
  [MODEL_IDS.NANO_BANANA_2]: {
    imageSize512: true,
    thinkingConfigurable: true,
    imageSearch: true,
    maxRefImages: 14,
    allAspectRatios: true,
  },
  [MODEL_IDS.NANO_BANANA_PRO]: {
    imageSize512: false,
    thinkingConfigurable: false,
    imageSearch: false,
    maxRefImages: 11,
    allAspectRatios: false,
  },
};

// -----------------------------------------------------------------------------
// Defaults
// -----------------------------------------------------------------------------

/** Default model when none is specified. */
export const DEFAULT_MODEL = MODEL_IDS.NANO_BANANA_2;

/** Default aspect ratio. */
export const DEFAULT_ASPECT_RATIO = "1:1" as const;

/** Default image size tier. */
export const DEFAULT_IMAGE_SIZE = "1K" as const;

/** Default thinking level. */
export const DEFAULT_THINKING_LEVEL = "minimal" as const;

/** Default response format for tool output. */
export const DEFAULT_RESPONSE_FORMAT = "markdown" as const;

// -----------------------------------------------------------------------------
// Limits
// -----------------------------------------------------------------------------

/** Maximum character length for MCP text responses before truncation. */
export const CHARACTER_LIMIT = 25000;

/** Session timeout: 30 minutes in milliseconds. */
export const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

// -----------------------------------------------------------------------------
// File System
// -----------------------------------------------------------------------------

/** Directory name (relative to cwd) where generated images are saved. */
export const OUTPUT_DIR = "nanobanana-output" as const;

// -----------------------------------------------------------------------------
// Supported Input MIME Types
// -----------------------------------------------------------------------------

/** MIME types accepted for source images. */
export const SUPPORTED_MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};
