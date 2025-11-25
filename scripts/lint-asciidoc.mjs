#!/usr/bin/env node
// Parse AsciiDoc sources with Asciidoctor to catch syntax errors early.

import Asciidoctor from "@asciidoctor/core";
import { globSync } from "glob";
import fs from "node:fs";

const asciidoctor = Asciidoctor();

const roots = ["docs"];
const ignored = [
  "**/build/**",
  "**/logs/**",
  "**/.cache/**",
  "**/node_modules/**",
];

const files = roots
  .flatMap((root) =>
    globSync(`${root}/**/*.adoc`, {
      ignore: ignored,
      nodir: true,
    }),
  )
  .sort();

let failures = 0;
let skipped = 0;

for (const file of files) {
  const content = fs.readFileSync(file, "utf8");
  if (
    content.includes("partial$") ||
    content.includes("example$") ||
    content.includes("attachment$")
  ) {
    skipped += 1;
    continue;
  }
  try {
    asciidoctor.convertFile(file, {
      safe: "safe",
      backend: "html5",
      to_file: false,
      mkdirs: false,
    });
  } catch (error) {
    failures += 1;
    console.error(`AsciiDoc parse failed: ${file}\n${error}\n`);
  }
}

if (failures > 0) {
  console.error(
    `AsciiDoc lint failed on ${failures} file(s); skipped ${skipped} Antora resource files.`,
  );
  process.exit(1);
}

console.log(
  `AsciiDoc lint passed for ${files.length - skipped} file(s); skipped ${skipped} Antora resource files.`,
);
