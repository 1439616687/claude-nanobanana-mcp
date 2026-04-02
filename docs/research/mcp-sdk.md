# MCP TypeScript SDK Reference

> **Research date**: 2026-04-01
> **Status**: VERIFIED via live web fetch
> **Sources**: 
> - https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/server.md
> - https://ts.sdk.modelcontextprotocol.io/documents/server.html
> - https://modelcontextprotocol.io/specification/2025-03-26/server/tools
> - https://github.com/anthropics/skills/blob/main/skills/mcp-builder/reference/node_mcp_server.md

---

## 1. Key Imports

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
```

---

## 2. McpServer Initialization

```typescript
const server = new McpServer({
  name: "service-mcp-server",
  version: "1.0.0"
});
```

Optional second argument for capabilities:
```typescript
const server = new McpServer(
  { name: "service-mcp-server", version: "1.0.0" },
  { capabilities: { logging: {} } }
);
```

---

## 3. registerTool Method (Full Pattern)

```typescript
server.registerTool(
  "tool_name",                    // string: snake_case tool name
  {
    title: "Tool Display Name",   // string: human-readable title
    description: "What it does",  // string: detailed description for LLM
    inputSchema: z.object({...}), // Zod schema for input validation
    outputSchema: z.object({...}),// Zod schema for structured output (optional)
    annotations: {                // Tool behavior hints (optional)
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true
    }
  },
  async (params) => {             // Handler callback
    const output = { result: "..." };
    return {
      content: [{ type: "text", text: "Human-readable text" }],
      structuredContent: output   // Must match outputSchema if provided
    };
  }
);
```

**IMPORTANT**: Use `server.registerTool()` — NOT the deprecated `server.tool()` API.

---

## 4. Tool Annotations

| Annotation | Type | Default | Meaning |
|---|---|---|---|
| `readOnlyHint` | boolean | false | Tool does not modify its environment |
| `destructiveHint` | boolean | true | Tool may irreversibly destroy/overwrite data |
| `idempotentHint` | boolean | false | Repeating same call has no additional effect |
| `openWorldHint` | boolean | true | Tool may interact with external entities |

Clients use these to determine confirmation prompts and UI treatment.

---

## 5. Zod Schema Best Practices

```typescript
const MyToolSchema = z.object({
  query: z.string()
    .min(1, "Required")
    .max(200, "Too long")
    .describe("Search string to match"),
  limit: z.number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe("Maximum results to return"),
  format: z.enum(["markdown", "json"])
    .default("markdown")
    .describe("Output format")
}).strict();  // .strict() forbids extra fields

type MyToolInput = z.infer<typeof MyToolSchema>;
```

Rules:
- Every field needs `.describe()` for documentation
- Use `.strict()` on all schemas to forbid extra fields
- Use `.default()` for optional parameters
- Use `.min()`, `.max()` for constraints
- Extract TypeScript types with `z.infer<typeof Schema>`
- Use `type` alias (not `interface`) for Zod-inferred types (assignability)

---

## 6. structuredContent Return Pattern

```typescript
async (params) => {
  const output = { total: 42, items: [...] };
  return {
    content: [{ type: "text", text: "Found 42 items" }],  // Required: human-readable
    structuredContent: output  // Optional: machine-readable, must match outputSchema
  };
}
```

For errors:
```typescript
return {
  content: [{ type: "text", text: "Error: Rate limit exceeded" }],
  isError: true
};
```

---

## 7. StdioServerTransport

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new McpServer({ name: "my-server", version: "1.0.0" });
const transport = new StdioServerTransport();
await server.connect(transport);
```

---

## 8. Complete Working Example

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({ name: "example-mcp-server", version: "1.0.0" });

const SearchSchema = z.object({
  query: z.string().min(1).max(200).describe("Search query string"),
  limit: z.number().int().min(1).max(100).default(20).describe("Max results"),
  offset: z.number().int().min(0).default(0).describe("Result offset"),
  response_format: z.enum(["markdown", "json"]).default("markdown").describe("Output format")
}).strict();

server.registerTool(
  "example_search",
  {
    title: "Search Items",
    description: `Search for items matching the query.

Args:
 - query (string): Search query string
 - limit (number): Max results (default: 20)
 - offset (number): Pagination offset (default: 0)
 - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns: { total, count, items, has_more }`,
    inputSchema: SearchSchema,
    outputSchema: z.object({
      total: z.number(),
      count: z.number(),
      items: z.array(z.object({ id: z.string(), name: z.string() })),
      has_more: z.boolean()
    }),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true
    }
  },
  async (params) => {
    try {
      const data = await fetchData(params.query, params.limit, params.offset);
      const output = {
        total: data.total,
        count: data.items.length,
        items: data.items,
        has_more: data.total > params.offset + data.items.length
      };
      return {
        content: [{ type: "text", text: `Found ${data.total} items` }],
        structuredContent: output
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : "Unknown"}` }],
        isError: true
      };
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
```

---

## 9. Tool Naming Convention

- Use snake_case: `search_users`, `create_project`
- Include service prefix: `nanobanana_generate_image`, `nanobanana_edit_image`
- Server name: `{service}-mcp-server` (lowercase with hyphens)

---

## 10. Tool Description Best Practices

Descriptions should include:
- What the tool does
- When to use it (vs other tools)
- Parameter documentation (Args section)
- Return value documentation (Returns section)
- Usage examples
- Error handling notes

---

## 11. Character Limits and Truncation

```typescript
const CHARACTER_LIMIT = 25000;

function truncateResponse(text: string, limit: number = CHARACTER_LIMIT): string {
  if (text.length <= limit) return text;
  return text.substring(0, limit - 100) + 
    "\n\n[Response truncated. Original length: " + text.length + " chars]";
}
```

---

## 12. Project Structure

```
{service}-mcp-server/
├── package.json          # "type": "module", main: "dist/index.js"
├── tsconfig.json         # strict: true, target: ES2020, module: ES2020
├── src/
│   ├── index.ts          # McpServer init, tool registration, transport
│   ├── types.ts          # TypeScript interfaces
│   ├── constants.ts      # API URLs, limits, defaults
│   ├── schemas/          # Zod validation schemas
│   ├── services/         # API clients, shared utilities
│   └── tools/            # Tool handler implementations
└── dist/                 # Built JS (entry: dist/index.js)
```

---

## 13. Package Configuration

### package.json
```json
{
  "name": "example-mcp-server",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
```

### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ES2020",
    "moduleResolution": "node",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

## 14. Quality Checklist

### Strategic Design
- [ ] Tool names: snake_case with service prefix
- [ ] Tool descriptions: include use cases, limitations, return schema
- [ ] Annotations: readOnlyHint, destructiveHint, idempotentHint, openWorldHint set correctly

### Implementation Quality
- [ ] All tools use registerTool (not deprecated server.tool())
- [ ] Every tool has title, description, inputSchema, annotations
- [ ] Zod schemas use .strict()
- [ ] All schema fields have .describe()
- [ ] Responses include both content and structuredContent
- [ ] CHARACTER_LIMIT enforced with truncation

### TypeScript Quality
- [ ] Strict mode in tsconfig.json
- [ ] No `any` types
- [ ] Explicit return types on async functions
- [ ] Types from Zod schemas via z.infer

### Package Config
- [ ] "type": "module" in package.json
- [ ] "main": "dist/index.js"
- [ ] Dependencies: @modelcontextprotocol/sdk, zod
