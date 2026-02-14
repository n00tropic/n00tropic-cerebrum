#!/usr/bin/env node
/**
 * Validate AGENTS.md files against schema
 *
 * Usage:
 *   node scripts/validate-agents-md.mjs [--check] [--fix]
 *
 * Options:
 *   --check    Exit with non-zero if validation fails (CI mode)
 *   --json     Output results as JSON
 */

import { readFile } from "fs/promises";
import { glob } from "glob";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// Required sections for AGENTS.md
const REQUIRED_SECTIONS = [
  "## Project Overview",
  "## Ecosystem Role",
  "## Build & Run",
  "## Code Style",
  "## Security & Boundaries",
  "## Definition of Done",
  "## Key Files",
  "## Integration with Workspace",
];

async function findAgentsMdFiles() {
  const patterns = ["**/AGENTS.md", "platform/**/AGENTS.md"];

  const files = [];
  for (const pattern of patterns) {
    const matches = await glob(pattern, { cwd: ROOT, absolute: true });
    files.push(...matches);
  }

  return files.filter(
    (f) => !f.includes("node_modules") && !f.includes("templates"),
  );
}

function validateStructure(content) {
  const issues = [];

  // Check required sections
  for (const section of REQUIRED_SECTIONS) {
    if (!content.includes(section)) {
      issues.push({
        type: "missing-section",
        message: `Missing required section: ${section}`,
        severity: "error",
      });
    }
  }

  // Check for Ecosystem Role diagram
  if (content.includes("## Ecosystem Role")) {
    const ecosystemRoleMatch = content.match(
      /## Ecosystem Role([\s\S]*?)(?=##|$)/,
    );
    if (ecosystemRoleMatch && !ecosystemRoleMatch[1].includes("```")) {
      issues.push({
        type: "missing-diagram",
        message: "Ecosystem Role section should contain a mermaid/text diagram",
        severity: "warning",
      });
    }
  }

  // Check for Definition of Done checklist
  if (content.includes("## Definition of Done")) {
    const dodMatch = content.match(/## Definition of Done([\s\S]*?)(?=##|$)/);
    if (dodMatch) {
      const checklistItems = dodMatch[1].match(/^\s*-\s*\[.\]/gm);
      if (!checklistItems || checklistItems.length < 3) {
        issues.push({
          type: "short-checklist",
          message: `Definition of Done should have at least 3 checklist items (found ${checklistItems?.length || 0})`,
          severity: "warning",
        });
      }
    }
  }

  // Check for Key Files table
  if (content.includes("## Key Files")) {
    const keyFilesMatch = content.match(/## Key Files([\s\S]*?)(?=##|$)/);
    if (keyFilesMatch) {
      const tableRows = keyFilesMatch[1].match(/\|.*\|.*\|/g);
      if (!tableRows || tableRows.length < 4) {
        // Header + separator + at least 2 rows
        issues.push({
          type: "short-table",
          message: "Key Files should have a table with at least 2 rows",
          severity: "warning",
        });
      }
    }
  }

  // Check for last updated date
  if (!content.match(/_Last updated:\s*\d{4}-\d{2}-\d{2}_/)) {
    issues.push({
      type: "missing-date",
      message:
        'Missing or invalid "Last updated" date format (should be _Last updated: YYYY-MM-DD_)',
      severity: "warning",
    });
  }

  return issues;
}

async function validateAgentsMd(filePath) {
  const content = await readFile(filePath, "utf8");
  const relativePath = filePath.replace(ROOT, "").replace(/^\//, "");

  const structureIssues = validateStructure(content);

  return {
    filePath: relativePath,
    valid: structureIssues.filter((i) => i.severity === "error").length === 0,
    issues: structureIssues,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const checkMode = args.includes("--check");
  const jsonMode = args.includes("--json");

  const files = await findAgentsMdFiles();

  if (!jsonMode) {
    console.log("🔍 AGENTS.md Validation");
    console.log(`Found ${files.length} AGENTS.md files`);
    console.log("");
  }

  const results = [];
  let totalErrors = 0;
  let totalWarnings = 0;

  for (const file of files) {
    const result = await validateAgentsMd(file);
    results.push(result);

    const errors = result.issues.filter((i) => i.severity === "error").length;
    const warnings = result.issues.filter(
      (i) => i.severity === "warning",
    ).length;
    totalErrors += errors;
    totalWarnings += warnings;

    if (!jsonMode) {
      if (result.valid && errors === 0) {
        console.log(`✅ ${result.filePath}`);
        if (warnings > 0) {
          console.log(`   ⚠️  ${warnings} warning(s)`);
        }
      } else {
        console.log(`❌ ${result.filePath}`);
        for (const issue of result.issues) {
          const icon = issue.severity === "error" ? "  ❌" : "  ⚠️ ";
          console.log(`${icon} ${issue.type}: ${issue.message}`);
        }
      }
    }
  }

  if (jsonMode) {
    console.log(
      JSON.stringify(
        {
          summary: {
            totalFiles: files.length,
            totalErrors,
            totalWarnings,
          },
          results,
        },
        null,
        2,
      ),
    );
  } else {
    console.log("");
    console.log("=".repeat(50));
    console.log(
      `Summary: ${files.length} files, ${totalErrors} errors, ${totalWarnings} warnings`,
    );

    if (totalErrors === 0 && totalWarnings === 0) {
      console.log("✅ All AGENTS.md files are valid!");
    } else if (totalErrors === 0) {
      console.log("⚠️  All files pass, but some warnings exist");
    } else {
      console.log("❌ Some files have errors that need to be fixed");
    }
  }

  if (checkMode && totalErrors > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
