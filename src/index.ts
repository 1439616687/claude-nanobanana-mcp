// =============================================================================
// nanobanana-mcp-server — Entry Point
//
// Initializes the MCP server, registers all 7 tools, and connects via
// StdioServerTransport.
// =============================================================================

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// Schemas
import {
  GenerateImageSchema,
  EditImageSchema,
  MultiEditStartSchema,
  MultiEditContinueSchema,
  MultiEditEndSchema,
  ListSessionsSchema,
  ListOptionsSchema,
  TOOL_DESCRIPTIONS,
} from "./schemas/tool-schemas.js";

// Tool handlers
import { handleGenerateImage } from "./tools/generate.js";
import { handleEditImage } from "./tools/edit.js";
import {
  handleMultiEditStart,
  handleMultiEditContinue,
  handleMultiEditEnd,
} from "./tools/multi-edit.js";
import { handleListOptions, handleListSessions } from "./tools/info.js";

// Types
import type {
  GenerateImageParams,
  EditImageParams,
  MultiEditStartParams,
  MultiEditContinueParams,
  MultiEditEndParams,
  ToolResult,
} from "./types.js";

// -----------------------------------------------------------------------------
// Startup Validation
// -----------------------------------------------------------------------------

function validateEnvironment(): void {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    console.error(
      "FATAL: GEMINI_API_KEY environment variable is not set.\n" +
        "Please set it before starting the server:\n" +
        "  export GEMINI_API_KEY=your_api_key_here\n" +
        "Or configure it in your MCP client settings.",
    );
    process.exit(1);
  }
}

// -----------------------------------------------------------------------------
// Server Setup
// -----------------------------------------------------------------------------

async function main(): Promise<void> {
  // 1. Validate that the API key is present
  validateEnvironment();

  // 2. Initialize the MCP server
  const server = new McpServer({
    name: "nanobanana-mcp-server",
    version: "1.0.0",
  });

  // ---------------------------------------------------------------------------
  // Tool 1: nanobanana_generate_image
  // ---------------------------------------------------------------------------
  server.registerTool(
    "nanobanana_generate_image",
    {
      title: "Generate Image",
      description: TOOL_DESCRIPTIONS.nanobanana_generate_image,
      inputSchema: GenerateImageSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params): Promise<ToolResult> => {
      const typedParams = params as unknown as GenerateImageParams;
      return handleGenerateImage(typedParams);
    },
  );

  // ---------------------------------------------------------------------------
  // Tool 2: nanobanana_edit_image
  // ---------------------------------------------------------------------------
  server.registerTool(
    "nanobanana_edit_image",
    {
      title: "Edit Image",
      description: TOOL_DESCRIPTIONS.nanobanana_edit_image,
      inputSchema: EditImageSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params): Promise<ToolResult> => {
      const typedParams = params as unknown as EditImageParams;
      return handleEditImage(typedParams);
    },
  );

  // ---------------------------------------------------------------------------
  // Tool 3: nanobanana_multi_edit_start
  // ---------------------------------------------------------------------------
  server.registerTool(
    "nanobanana_multi_edit_start",
    {
      title: "Start Multi-Edit Session",
      description: TOOL_DESCRIPTIONS.nanobanana_multi_edit_start,
      inputSchema: MultiEditStartSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params): Promise<ToolResult> => {
      const typedParams = params as unknown as MultiEditStartParams;
      return handleMultiEditStart(typedParams);
    },
  );

  // ---------------------------------------------------------------------------
  // Tool 4: nanobanana_multi_edit_continue
  // ---------------------------------------------------------------------------
  server.registerTool(
    "nanobanana_multi_edit_continue",
    {
      title: "Continue Multi-Edit Session",
      description: TOOL_DESCRIPTIONS.nanobanana_multi_edit_continue,
      inputSchema: MultiEditContinueSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params): Promise<ToolResult> => {
      const typedParams = params as unknown as MultiEditContinueParams;
      return handleMultiEditContinue(typedParams);
    },
  );

  // ---------------------------------------------------------------------------
  // Tool 5: nanobanana_multi_edit_end
  // ---------------------------------------------------------------------------
  server.registerTool(
    "nanobanana_multi_edit_end",
    {
      title: "End Multi-Edit Session",
      description: TOOL_DESCRIPTIONS.nanobanana_multi_edit_end,
      inputSchema: MultiEditEndSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params): Promise<ToolResult> => {
      const typedParams = params as unknown as MultiEditEndParams;
      return handleMultiEditEnd(typedParams);
    },
  );

  // ---------------------------------------------------------------------------
  // Tool 6: nanobanana_list_sessions
  // ---------------------------------------------------------------------------
  server.registerTool(
    "nanobanana_list_sessions",
    {
      title: "List Active Sessions",
      description: TOOL_DESCRIPTIONS.nanobanana_list_sessions,
      inputSchema: ListSessionsSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (): Promise<ToolResult> => {
      return handleListSessions();
    },
  );

  // ---------------------------------------------------------------------------
  // Tool 7: nanobanana_list_options
  // ---------------------------------------------------------------------------
  server.registerTool(
    "nanobanana_list_options",
    {
      title: "List Available Options",
      description: TOOL_DESCRIPTIONS.nanobanana_list_options,
      inputSchema: ListOptionsSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (): Promise<ToolResult> => {
      return handleListOptions();
    },
  );

  // ---------------------------------------------------------------------------
  // Connect Transport
  // ---------------------------------------------------------------------------
  const transport = new StdioServerTransport();
  console.error("nanobanana-mcp-server v1.0.0 starting...");
  await server.connect(transport);
  console.error("nanobanana-mcp-server connected and ready.");
}

// Run
main().catch((error: unknown) => {
  console.error("Fatal error starting nanobanana-mcp-server:", error);
  process.exit(1);
});
