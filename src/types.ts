// =============================================================================
// nanobanana-mcp-server — TypeScript Interfaces
// =============================================================================

// -----------------------------------------------------------------------------
// Gemini API: Request Types
// -----------------------------------------------------------------------------

/** A single part within a Gemini content message. */
export interface GeminiPart {
  /** Text content of this part. */
  text?: string;
  /** Inline binary data (base64-encoded image). */
  inlineData?: {
    mimeType: string;
    data: string;
  };
  /** If true, this part is internal thought and should not be shown to the user. */
  thought?: boolean;
  /** Opaque token that must be preserved verbatim in multi-turn conversations. */
  thoughtSignature?: string;
}

/** A single message in the Gemini conversation. */
export interface GeminiContent {
  /** The role that authored this content: "user" or "model". */
  role: "user" | "model";
  /** Ordered list of parts composing this message. */
  parts: GeminiPart[];
}

/** Image output configuration within generationConfig. */
export interface ImageConfig {
  /** Aspect ratio of the generated image. */
  aspectRatio?: string;
  /** Resolution tier of the generated image: "512", "1K", "2K", or "4K". */
  imageSize?: string;
}

/** Thinking behavior configuration within generationConfig. */
export interface ThinkingConfig {
  /** Depth of thinking: "minimal" or "High". */
  thinkingLevel?: string;
  /** Whether to include thought parts in the response. */
  includeThoughts?: boolean;
}

/** The generationConfig block sent in a Gemini API request. */
export interface GenerationConfig {
  /** Which modalities the model should produce. */
  responseModalities: string[];
  /** Image output settings. */
  imageConfig?: ImageConfig;
  /** Thinking behavior settings. */
  thinkingConfig?: ThinkingConfig;
}

/** Google Search tool configuration. */
export interface GeminiSearchTool {
  google_search: GoogleSearchConfig;
}

/** Inner config for Google Search, optionally with search type specifiers. */
export interface GoogleSearchConfig {
  searchTypes?: {
    webSearch?: Record<string, never>;
    imageSearch?: Record<string, never>;
  };
}

/** Top-level request body for Gemini generateContent. */
export interface GeminiRequestBody {
  /** Conversation history / input content. */
  contents: GeminiContent[];
  /** Output configuration (modalities, image config, thinking config). */
  generationConfig: GenerationConfig;
  /** Optional tool declarations (e.g., Google Search grounding). */
  tools?: GeminiSearchTool[];
}

// -----------------------------------------------------------------------------
// Gemini API: Response Types
// -----------------------------------------------------------------------------

/** Safety rating for a response candidate. */
export interface SafetyRating {
  category: string;
  probability: string;
  blocked?: boolean;
}

/** A single candidate in the Gemini response. */
export interface GeminiCandidate {
  /** The generated content. May be absent if blocked by safety filters. */
  content?: {
    parts: GeminiPart[];
  };
  /** Reason generation stopped. "SAFETY" means content was blocked. */
  finishReason?: string;
  /** Safety ratings that may explain why content was blocked. */
  safetyRatings?: SafetyRating[];
}

/** Grounding metadata returned when search tools are enabled. */
export interface GroundingMetadata {
  searchEntryPoint?: {
    rendered_content: string;
  };
  groundingChunks?: Array<{
    uri: string;
  }>;
}

/** Top-level response body from Gemini generateContent. */
export interface GeminiResponseBody {
  /** Generated candidates (usually one). */
  candidates?: GeminiCandidate[];
  /** Grounding metadata (present when search tools were used). */
  groundingMetadata?: GroundingMetadata;
  /** Error object (present on non-200 responses). */
  error?: {
    code: number;
    message: string;
    status: string;
  };
}

// -----------------------------------------------------------------------------
// Session State (Multi-Turn Editing)
// -----------------------------------------------------------------------------

/** State for an active multi-turn editing session. */
export interface SessionState {
  /** Unique session identifier (UUID v4). */
  id: string;
  /** The model ID being used for this session. */
  modelId: string;
  /** Full conversation history including all parts and thought_signatures. */
  contents: GeminiContent[];
  /** The generationConfig used when this session was created. */
  generationConfig: GenerationConfig;
  /** Optional tools config (search grounding) used when this session was created. */
  tools?: GeminiSearchTool[];
  /** Output format for text content in tool results. */
  responseFormat: "markdown" | "json";
  /** ISO 8601 timestamp when the session was created. */
  createdAt: string;
  /** ISO 8601 timestamp of the last API interaction. */
  lastAccessedAt: string;
}

// -----------------------------------------------------------------------------
// MCP Tool Result
// -----------------------------------------------------------------------------

/** Text content item in a tool result. */
export interface TextContent {
  type: "text";
  text: string;
}

/** Image content item in a tool result. */
export interface ImageContent {
  type: "image";
  data: string;
  mimeType: string;
}

/** A single content item in a tool result (discriminated union). */
export type ToolResultContent = TextContent | ImageContent;

/** Standard return shape from all tool handlers. */
export interface ToolResult {
  [key: string]: unknown;
  content: ToolResultContent[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

// -----------------------------------------------------------------------------
// Tool Parameter Types (inferred from Zod schemas, declared here for reference)
// -----------------------------------------------------------------------------

/** Common image generation parameters shared across generate/edit tools. */
export interface CommonImageParams {
  model: string;
  aspect_ratio: string;
  image_size: string;
  thinking_level: string;
  enable_search: boolean;
  enable_image_search: boolean;
  response_format: "markdown" | "json";
}

/** Parameters for nanobanana_generate_image. */
export interface GenerateImageParams extends CommonImageParams {
  prompt: string;
}

/** Parameters for nanobanana_edit_image. */
export interface EditImageParams extends CommonImageParams {
  edit_instruction: string;
  source_image_path: string;
}

/** Parameters for nanobanana_multi_edit_start. */
export interface MultiEditStartParams extends CommonImageParams {
  prompt: string;
  source_image_path?: string;
}

/** Parameters for nanobanana_multi_edit_continue. */
export interface MultiEditContinueParams {
  session_id: string;
  edit_instruction: string;
}

/** Parameters for nanobanana_multi_edit_end. */
export interface MultiEditEndParams {
  session_id: string;
}

// nanobanana_list_sessions and nanobanana_list_options take no parameters.

// -----------------------------------------------------------------------------
// Structured Output Types (for structuredContent in tool results)
// -----------------------------------------------------------------------------

/** Structured output for image generation/edit results. */
export interface ImageResultOutput {
  /** Whether the operation succeeded. */
  success: boolean;
  /** Absolute path to the saved image file on disk. */
  image_path?: string;
  /** Model ID that was used. */
  model?: string;
  /** Any text content returned by the model alongside the image. */
  text_response?: string;
  /** Error message if the operation failed. */
  error?: string;
}

/** Structured output for multi-edit start (includes session_id). */
export interface MultiEditStartOutput extends ImageResultOutput {
  /** The session ID for subsequent continue/end calls. */
  session_id?: string;
}

/** Structured output for multi-edit continue. */
export interface MultiEditContinueOutput extends ImageResultOutput {
  /** The session ID being used. */
  session_id: string;
  /** How many turns have been completed in this session. */
  turn_count: number;
}

/** Structured output for multi-edit end. */
export interface MultiEditEndOutput {
  /** Whether the session was successfully ended. */
  success: boolean;
  /** The session ID that was ended. */
  session_id: string;
  /** Total turns completed in the session. */
  total_turns: number;
  /** Error message if the operation failed. */
  error?: string;
}

/** Summary of a single session for list_sessions. */
export interface SessionSummary {
  id: string;
  model: string;
  turn_count: number;
  created_at: string;
  last_accessed_at: string;
}

/** Structured output for list_sessions. */
export interface ListSessionsOutput {
  [key: string]: unknown;
  sessions: SessionSummary[];
  total: number;
}

/** Structured output for list_options. */
export interface ListOptionsOutput {
  [key: string]: unknown;
  models: Array<{
    id: string;
    name: string;
    features: string[];
    recommended_for: string;
  }>;
  aspect_ratios: string[];
  image_sizes: string[];
  thinking_levels: string[];
  parameter_compatibility: Record<string, Record<string, boolean>>;
}

// -----------------------------------------------------------------------------
// Utility Types
// -----------------------------------------------------------------------------

/** Result of parameter compatibility validation. */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}
