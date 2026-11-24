import fs from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();
const SRC_DIR = path.join(ROOT_DIR, "src");

/**
 * Recursively collects all `.ts` and `.tsx` files under `dir`.
 */
function collectSourceFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectSourceFiles(fullPath));
    } else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Strips single-line and block comments while preserving string and template literals.
 */
function stripComments(source) {
  let out = "";
  let i = 0;
  const len = source.length;

  while (i < len) {
    const ch = source[i];
    const next = source[i + 1];

    if (ch === "'" || ch === '"' || ch === "`") {
      const quote = ch;
      out += ch;
      i++;
      while (i < len) {
        const c = source[i];
        out += c;
        if (c === "\\") {
          i++;
          if (i < len) {
            out += source[i];
            i++;
          }
          continue;
        }
        if (c === quote) {
          i++;
          break;
        }
        i++;
      }
      continue;
    }

    if (ch === "/" && next === "/") {
      i += 2;
      while (i < len && source[i] !== "\n") {
        i++;
      }
      continue;
    }

    if (ch === "/" && next === "*") {
      i += 2;
      while (i < len && !(source[i] === "*" && source[i + 1] === "/")) {
        if (source[i] === "\n") out += "\n";
        i++;
      }
      i += 2;
      continue;
    }

    out += ch;
    i++;
  }

  return out;
}

const files = collectSourceFiles(SRC_DIR).sort();
const violations = [];

const RUNTIME_IMPORT_EXPORT_RE =
  /(?:^|[;\n])\s*(?:import|export)\s+(?!type\b)(?:[^;'"]*?\bfrom\s+)?(['"])(\.{1,2}\/[^'"]+)\1/g;

for (const filePath of files) {
  const relPath = path.relative(ROOT_DIR, filePath).replace(/\\/g, "/");
  const content = fs.readFileSync(filePath, "utf8");
  const isTestFile = relPath.split("/").includes("__tests__");

  // 1) Every file outside __tests__ must contain SPDX-License-Identifier: MIT
  if (!isTestFile && !content.includes("SPDX-License-Identifier: MIT")) {
    violations.push(`${relPath}: missing "SPDX-License-Identifier: MIT" header`);
  }

  // 2) No file may contain eval( or dangerouslySetInnerHTML
  if (content.includes("eval(")) {
    violations.push(`${relPath}: forbidden "eval(" usage detected`);
  }
  if (content.includes("dangerouslySetInnerHTML")) {
    violations.push(`${relPath}: forbidden "dangerouslySetInnerHTML" usage detected`);
  }

  // 3) No file in src/ may contain U+2014 (em-dash)
  if (content.includes("\u2014")) {
    violations.push(`${relPath}: forbidden em-dash (U+2014) character detected`);
  }

  // 4) Non-type relative imports/exports in src/utils/**/*.ts and src/constants/**/*.ts must end with .ts
  if (
    relPath.endsWith(".ts") &&
    (relPath.startsWith("src/utils/") || relPath.startsWith("src/constants/"))
  ) {
    const stripped = stripComments(content);
    RUNTIME_IMPORT_EXPORT_RE.lastIndex = 0;
    let match;
    while ((match = RUNTIME_IMPORT_EXPORT_RE.exec(stripped)) !== null) {
      const specifier = match[2];
      if (!specifier.endsWith(".ts")) {
        violations.push(
          `${relPath}: runtime relative import/export "${specifier}" must end with ".ts"`
        );
      }
    }
  }
}

if (violations.length > 0) {
  console.error("Code audit failed with violations:");
  for (const v of violations) {
    console.error(`  - ${v}`);
  }
  process.exit(1);
}

console.log(`Code audit passed: ${files.length} source files verified.`);
