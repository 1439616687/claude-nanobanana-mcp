// =============================================================================
// nanobanana-mcp-server — Image I/O Handler
// =============================================================================

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { randomBytes } from "node:crypto";

import { OUTPUT_DIR, SUPPORTED_MIME_TYPES } from "../constants.js";

// -----------------------------------------------------------------------------
// Internal Helpers
// -----------------------------------------------------------------------------

/**
 * Detects the MIME type of a file based on its extension.
 * Throws if the extension is not in the supported set.
 */
function detectMimeType(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  const mimeType = SUPPORTED_MIME_TYPES[ext];

  if (!mimeType) {
    const supported = Object.keys(SUPPORTED_MIME_TYPES).join(", ");
    throw new Error(
      `Unsupported image format "${ext}" for file "${filePath}". ` +
        `Supported formats: ${supported}`,
    );
  }

  return mimeType;
}

/**
 * Ensures the output directory exists, creating it recursively if necessary.
 * Returns the absolute path of the output directory.
 */
async function ensureOutputDir(): Promise<string> {
  const dirPath = resolve(process.cwd(), OUTPUT_DIR);
  await mkdir(dirPath, { recursive: true });
  return dirPath;
}

/**
 * Generates a unique filename using the current timestamp and 4 random
 * hexadecimal characters.
 */
function generateFilename(): string {
  const timestamp = Date.now();
  const randomSuffix = randomBytes(2).toString("hex"); // 4 hex chars
  return `${timestamp}-${randomSuffix}.png`;
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

/**
 * Reads an image file from disk and returns its contents as a base64 string
 * along with the detected MIME type.
 *
 * @param filePath - Absolute or relative path to the image file.
 * @returns Object with `data` (base64 string, no data URI prefix) and `mimeType`.
 */
export async function readImageAsBase64(
  filePath: string,
): Promise<{ data: string; mimeType: string }> {
  const absolutePath = resolve(filePath);
  const mimeType = detectMimeType(absolutePath);

  let buffer: Buffer;
  try {
    buffer = await readFile(absolutePath);
  } catch (err: unknown) {
    if (
      err !== null &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "ENOENT"
    ) {
      throw new Error(
        `Image file not found: "${absolutePath}". ` +
          `Verify the path exists and is accessible.`,
      );
    }
    throw err;
  }

  const data = buffer.toString("base64");
  return { data, mimeType };
}

/**
 * Saves base64-encoded image data to disk in the output directory.
 * Auto-creates the output directory if it does not exist.
 *
 * @param base64Data  - Raw base64 string (no data URI prefix).
 * @param description - Optional human-readable label for log output (e.g., "generated", "edited", "multi-edit").
 * @returns Absolute path to the saved file.
 */
export async function saveBase64Image(
  base64Data: string,
  description?: string,
): Promise<string> {
  const outputDir = await ensureOutputDir();
  const filename = generateFilename();
  const filePath = resolve(outputDir, filename);

  const buffer = Buffer.from(base64Data, "base64");
  await writeFile(filePath, buffer);

  if (description) {
    console.error(`[image-handler] Saved image: ${filePath} (${description})`);
  } else {
    console.error(`[image-handler] Saved image: ${filePath}`);
  }

  return filePath;
}
