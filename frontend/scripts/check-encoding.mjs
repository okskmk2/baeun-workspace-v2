import fs from "node:fs/promises";
import path from "node:path";

const ROOT_DIR = process.cwd();
const TARGET_DIRS = ["src", "public"];
const TARGET_EXTENSIONS = new Set([
  ".vue",
  ".js",
  ".mjs",
  ".cjs",
  ".ts",
  ".tsx",
  ".jsx",
  ".json",
  ".css",
  ".scss",
  ".sass",
  ".md",
  ".html",
  ".yml",
  ".yaml",
]);

const decoder = new TextDecoder("utf-8", { fatal: true });

async function walk(directoryPath, results = []) {
  const entries = await fs.readdir(directoryPath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".git") {
      continue;
    }

    const fullPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath, results);
      continue;
    }

    const extension = path.extname(entry.name).toLowerCase();
    if (TARGET_EXTENSIONS.has(extension)) {
      results.push(fullPath);
    }
  }

  return results;
}

async function checkFileEncoding(filePath) {
  const buffer = await fs.readFile(filePath);

  try {
    decoder.decode(buffer);
  } catch {
    return { filePath, reason: "invalid utf-8 byte sequence" };
  }

  const text = buffer.toString("utf8");
  if (text.includes("\uFFFD") || text.includes("?�")) {
    return { filePath, reason: "contains mojibake marker (U+FFFD or '?�')" };
  }

  return null;
}

async function main() {
  const files = [];

  for (const targetDir of TARGET_DIRS) {
    const absoluteDir = path.join(ROOT_DIR, targetDir);
    try {
      const stat = await fs.stat(absoluteDir);
      if (stat.isDirectory()) {
        await walk(absoluteDir, files);
      }
    } catch {
      // target dir does not exist
    }
  }

  const failures = [];
  for (const filePath of files) {
    const result = await checkFileEncoding(filePath);
    if (result) {
      failures.push(result);
    }
  }

  if (failures.length > 0) {
    console.error(`❌ UTF-8 check failed in ${failures.length} file(s):`);
    for (const { filePath, reason } of failures) {
      console.error(`- ${path.relative(ROOT_DIR, filePath)}: ${reason}`);
    }
    process.exit(1);
  }

  console.log(`✅ UTF-8 check passed (${files.length} files scanned).`);
}

main().catch((error) => {
  console.error("❌ UTF-8 check script failed:");
  console.error(error);
  process.exit(1);
});
