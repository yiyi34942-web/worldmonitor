import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { repoRoot } from "./registry.mjs";

const SCAN_DIRS = Object.freeze(["src/wtils", "docker/wtils", "deploy/wtils", "scripts/wtils"]);

function walk(dir, acc) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (/\.(mjs|yml|yaml|env|md|json|example)$/.test(entry.name)) acc.push(full);
  }
}

/**
 * Scan WTILS runtime trees for machine-specific pins.
 * Needles are split so this file does not match itself.
 */
export function scanPortability(root = repoRoot) {
  const files = [];
  for (const dir of SCAN_DIRS) walk(path.join(root, dir), files);
  const findings = [];
  const homeNeedle = `/${"Users"}/`;
  const nameNeedle = ["den", "gyi"].join("");
  const floatingRedis = ["redis:", "7-alpine"].join("");
  const nasPath = `/${"Volumes"}/`;
  const smbPath = ["smb", "://"].join("");
  const nfsPath = ["nfs", "://"].join("");
  const ipPattern = /\b(?:\d{1,3}\.){3}\d{1,3}\b/;
  const endpointPattern = /https?:\/\/[^\s]*11434/;
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    const relative = path.relative(root, file);
    if (text.includes(homeNeedle)) findings.push(`${relative} contains a user home path`);
    if (text.includes(nameNeedle)) findings.push(`${relative} contains a username`);
    if (ipPattern.test(text)) findings.push(`${relative} contains an IP literal`);
    if (endpointPattern.test(text)) findings.push(`${relative} pins a model endpoint`);
    if (text.includes(nasPath)) findings.push(`${relative} contains a NAS volume path`);
    if (text.includes(smbPath) || text.includes(nfsPath)) findings.push(`${relative} contains a fixed NAS path`);
    if ((relative.startsWith("docker/wtils/") || relative.startsWith("deploy/wtils/")) && text.includes(floatingRedis)) {
      findings.push(`${relative} uses a floating Redis tag`);
    }
  }
  return { findings, files_scanned: files.length };
}
