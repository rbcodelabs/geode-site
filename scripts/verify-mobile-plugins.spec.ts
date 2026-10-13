import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import { expect, test, type Page } from "@playwright/test";

const mobileUrl = pathToFileURL(path.resolve(__dirname, "../../dist/mobile/index.html")).href;
const proofUrl = `${mobileUrl}?external-vault-proof=1`;
const CATALOG_URL = "https://geode.rbcodelabs.com/supported-plugins/v1.json";
const real = JSON.parse(fs.readFileSync(process.env.CATALOG_JSON ?? path.resolve(__dirname, "../src/data/supported-plugins.v1.json"), "utf8"));
const wanted = { calendar: ["liamcain", "obsidian-calendar-plugin"], "kanban-bases-view": ["xiwcx", "obsidian-bases-kanban"] } as const;
const dirOf: Record<string, string> = { calendar: "calendar", "kanban-bases-view": "kanban-bases-view" };
const entries = real.plugins.filter((p: any) => p.id in wanted).map((p: any) => ({ ...p, platforms: ["desktop", "mobile"] }));
// Reproduction harness for docs/compatibility/plugin-catalog-mobile-2026-10-13.md.
// Copy into the Geode checkout as tests/mobile/verify-mobile-plugins.spec.ts and run
//   CATALOG_JSON=<path to src/data/supported-plugins.v1.json> ARTIFACTS=<dir with calendar/ and kanban-bases-view/ release assets> SHOTS=<dir> \
//   npm run build:mobile && npx playwright test --config playwright.mobile.config.ts \
//     tests/mobile/verify-mobile-plugins.spec.ts --workers=2
// It overrides platforms to ["desktop","mobile"] in memory so the Install flow is
// exercised against the real, hash-checked release bytes.
const ARTIFACTS = process.env.ARTIFACTS ?? "/tmp/plugin-artifacts";
const SHOTS = process.env.SHOTS ?? "/tmp/mobile-shots";
const CORS = { "access-control-allow-origin": "*" };
test.use({ bypassCSP: true });

function collect(page: Page) {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errors.push(`[${m.type()}] ${m.text()}`); });
  page.on("pageerror", (e) => errors.push(`[pageerror] ${String(e)}`));
  return errors;
}

async function setup(page: Page) {
  await page.route(CATALOG_URL, (r) => r.fulfill({ status: 200, contentType: "application/json", headers: CORS, body: JSON.stringify({ schemaVersion: 1, plugins: entries }) }));
  await page.route("https://github.com/**", (r) => {
    const m = r.request().url().match(/github\.com\/[^/]+\/([^/]+)\/releases\/download\/([^/]+)\/(.+)$/)!;
    const id = Object.entries(wanted).find(([, v]) => v[1] === m[1])![0];
    const f = path.join(ARTIFACTS, dirOf[id], m[3]);
    return fs.existsSync(f) ? r.fulfill({ status: 200, headers: CORS, contentType: "application/octet-stream", body: fs.readFileSync(f) }) : r.fulfill({ status: 404, headers: CORS, body: "nf" });
  });
  await page.goto(proofUrl);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.evaluate(() => (window as any).app.commands.execute("open-another-vault"));
  await page.getByRole("button", { name: "Choose folder in Files" }).click();
  await expect.poll(() => page.evaluate(() => (window as any).app?.vault?.root)).toBe("external://browser-provider-proof");
  await page.getByRole("navigation", { name: "Mobile navigation" }).getByRole("button", { name: "More" }).click();
  await page.locator(".menu.mod-mobile-more").getByText("Settings", { exact: true }).click();
  await page.getByText("Community plugins & themes", { exact: true }).click();
}

async function installAndEnable(page: Page, id: string, name: string, shot: string) {
  const row = page.locator(`.supported-plugin-catalog [data-plugin-id="${id}"]`);
  await row.getByRole("button", { name: "Install" }).click();
  await expect(row.locator(".supported-plugin-status")).toContainText(`Installed ${name}`);
  expect(await page.evaluate((i) => (window as any).app.pluginManager.isEnabled(i), id)).toBe(false);
  const installed = page.locator(`.community-list .mobile-plugin-item[data-plugin-id="${id}"]`);
  await expect(installed).toContainText("Mobile compatible");
  await installed.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${SHOTS}/${shot}-installed-${test.info().project.name.replace(/ /g, "")}.png` });
  await installed.getByRole("button", { name: "Enable" }).click();
  await expect.poll(() => page.evaluate((i) => (window as any).app.pluginManager.isEnabled(i), id)).toBe(true);
  const done = page.getByText("Done", { exact: true });
  if (await done.isVisible()) await done.click(); else await page.keyboard.press("Escape");
  await expect(page.locator(".modal")).toHaveCount(0);
}

test("@phone @tablet calendar", async ({ page }) => {
  const errors = collect(page);
  await setup(page);
  await installAndEnable(page, "calendar", "Calendar", "calendar");
  const proj = test.info().project.name.replace(/ /g, "");
  console.log("calendar commands:", await page.evaluate(() => Object.keys((window as any).app.commands.commands ?? {}).filter((k) => k.startsWith("calendar:"))));
  await page.evaluate(() => (window as any).app.commands.execute("calendar:show-calendar-view"));
  await page.getByRole("navigation", { name: "Mobile navigation" }).getByRole("button", { name: "Details" }).click();
  await page.locator('.workspace-tab-header[data-type="calendar"]').click();
  await page.waitForTimeout(1500);
  const cal = page.locator('[data-type="calendar"], .workspace-leaf-content[data-type="calendar"]').first();
  console.log("calendar leaf count", await page.locator('[data-type="calendar"]').count(), "calendar elements", await page.locator("#calendar-container, .calendar").count());
  await page.screenshot({ path: `${SHOTS}/calendar-view-${proj}.png` });
  const html = await page.evaluate(() => document.querySelector("#calendar-container, [data-type=calendar]")?.outerHTML.slice(0, 600));
  console.log("calendar html:", html);
  await expect(page.locator("#calendar-container, .calendar").first()).toBeVisible();
  const cells = await page.locator("#calendar-container td, .calendar td").count();
  console.log("day cells", cells);
  expect(cells).toBeGreaterThanOrEqual(28);
  // click today -> creates daily note
  await page.locator("#calendar-container .day.today, .calendar .day.today").first().click().catch((e) => console.log("today click:", String(e).slice(0, 200)));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${SHOTS}/calendar-after-click-${proj}.png` });
  await page.locator(".modal").getByRole("button", { name: "Create", exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).app.workspace.getActiveFile?.()?.path ?? (window as any).app.getActiveFile?.()?.path)).toBe("2026-10-13.md");
  await page.screenshot({ path: `${SHOTS}/calendar-daily-created-${proj}.png` });
  console.log("CONSOLE:", JSON.stringify(errors, null, 1));
  expect(errors).toEqual([]);
});

test("@phone @tablet kanban", async ({ page }) => {
  const errors = collect(page);
  await setup(page);
  await installAndEnable(page, "kanban-bases-view", "Kanban Bases View", "kanban");
  const proj = test.info().project.name.replace(/ /g, "");
  await page.evaluate(async () => {
    const host = window.hostServices!.vaultFiles;
    await host.mkdir("Tasks");
    await host.write("Tasks/Alpha.md", "---\nstatus: Todo\npriority: 1\n---\nA\n");
    await host.write("Tasks/Beta.md", "---\nstatus: Doing\npriority: 2\n---\nB\n");
    await host.write("Tasks/Gamma.md", "---\nstatus: Done\npriority: 3\n---\nC\n");
    await host.write("Tasks/Delta.md", "---\nstatus: Todo\npriority: 4\n---\nD\n");
    await host.write("Views/Board.base", ["filters:", "  and:", "    - file.inFolder(\"Tasks\")", "views:", "  - type: kanban-view", "    name: Board", "    groupByProperty: note.status", "    order: [file.name, note.status, note.priority]", ""].join("\n"));
    const app = (window as any).app;
    await app.reconcileVault("manual");
    await app.openFile(app.vault.getFileByPath("Views/Board.base"), false);
  });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${SHOTS}/kanban-view-${proj}.png` });
  console.log("kanban html:", await page.evaluate(() => document.querySelector(".base-view")?.outerHTML.slice(0, 1500)));
  await expect(page.locator(".base-view")).toBeVisible();
  await expect(page.locator(".obk-column")).toHaveCount(3);
  await expect(page.locator(".obk-card")).toHaveCount(4);
  console.log("columns:", await page.locator(".obk-column").evaluateAll((els) => els.map((e) => e.textContent)));
  expect(await page.locator("style[data-plugin-id='kanban-bases-view']").count()).toBeGreaterThan(0);
  console.log("CONSOLE:", JSON.stringify(errors, null, 1));
  expect(errors).toEqual([]);
});
