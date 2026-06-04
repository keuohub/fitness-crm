import * as fs from "fs";
import * as path from "path";

const API_DIR = path.join(process.cwd(), "src", "app", "api");
const APP_DIR = path.join(process.cwd(), "src", "app");

interface Finding {
  file: string;
  issue: string;
  severity: "critical" | "high" | "medium" | "low";
}

const findings: Finding[] = [];

function walkDir(dir: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walkDir(full));
    else if (entry.name === "route.ts") files.push(full);
  }
  return files;
}

const authKeywords = [
  "verifyMemberAccess",
  "requireAdmin",
  "getPortalMemberId",
  "getAdminSession",
  "portal_member_id",
  "admin_session",
];

const apiRoutes = walkDir(API_DIR);

for (const route of apiRoutes) {
  const content = fs.readFileSync(route, "utf-8");
  const relativePath = path.relative(process.cwd(), route);

  if (relativePath.includes("/login/") || relativePath.includes("/me/")) continue;
  if (relativePath.includes("/platform-stats/") || relativePath.includes("/cases/") || relativePath.includes("/ai-report-sample/")) continue;

  const hasAuth = authKeywords.some((kw) => content.includes(kw));
  if (!hasAuth) {
    findings.push({
      file: relativePath,
      issue: "API route has no authentication check",
      severity: "high",
    });
  }
}

const middlewarePath = path.join(process.cwd(), "src", "middleware.ts");
if (!fs.existsSync(middlewarePath)) {
  findings.push({
    file: "src/middleware.ts",
    issue: "No middleware.ts",
    severity: "critical",
  });
}

const adminLoginPath = path.join(APP_DIR, "admin", "login", "page.tsx");
if (!fs.existsSync(adminLoginPath)) {
  findings.push({
    file: "src/app/admin/login/page.tsx",
    issue: "No admin login page",
    severity: "high",
  });
}

console.log("\n=== SECURITY AUDIT ===\n");
if (findings.length === 0) {
  console.log("All checks passed.");
} else {
  const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const f of findings) {
    bySeverity[f.severity]++;
    console.log(`[${f.severity.toUpperCase()}] ${f.file}`);
    console.log(`  -> ${f.issue}\n`);
  }
  console.log("---");
  console.log(`Total: ${findings.length} (C:${bySeverity.critical} H:${bySeverity.high} M:${bySeverity.medium} L:${bySeverity.low})`);
}

console.log(`\nAPI routes scanned: ${apiRoutes.length}`);
console.log(`Middleware: ${fs.existsSync(middlewarePath) ? "YES" : "NO"}`);
console.log(`Admin login: ${fs.existsSync(adminLoginPath) ? "YES" : "NO"}`);
