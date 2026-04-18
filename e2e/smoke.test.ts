import { expect, test, type Page } from "@playwright/test";

const GLOBAL_MODE_LABELS = ["六壬神課", "奇門遁甲", "金口訣", "断易", "太乙神数"] as const;

const MODE_CASES = [
  { path: "/", label: "六壬神課", boardSelector: ".plate-grid" },
  { path: "/qimen/", label: "奇門遁甲", boardSelector: ".qimen-plate-grid" },
  { path: "/kingoketsu/", label: "金口訣", boardSelector: ".kingoketsu-board" },
  { path: "/danneki/", label: "断易", boardSelector: ".danneki-board" },
  { path: "/taiitsu/", label: "太乙神数", boardSelector: ".plate-grid" },
] as const;

const WUXING_FILLS = ["#2f9e44", "#d83b3b", "#8a5a36", "#f2c94c", "#1f78d1"] as const;

test.use({ viewport: { width: 1440, height: 1000 } });

function trackConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}

async function expectOneGridTrack(page: Page, selector: string) {
  const info = await page.locator(selector).first().evaluate((element) => {
    const styles = window.getComputedStyle(element);
    return {
      display: styles.display,
      gridTemplateColumns: styles.gridTemplateColumns,
    };
  });

  expect(info.display).toContain("grid");
  expect(info.gridTemplateColumns.trim().split(/\s+/)).toHaveLength(1);
}

async function expectWuxingColors(page: Page) {
  const fills = await page.locator(".relationship-map .wuxing-pentagram svg circle").evaluateAll((circles) =>
    circles.map((circle) => circle.getAttribute("fill")),
  );
  expect(fills).toEqual(expect.arrayContaining([...WUXING_FILLS]));
}

test.describe("占術ワークスペース", () => {
  test("グローバルのモード切り替えが5モードを表示する", async ({ page }) => {
    await page.goto("/");

    const buttons = page.locator(".app-header .mode-button");
    await expect(buttons).toHaveCount(GLOBAL_MODE_LABELS.length);
    await expect(buttons).toHaveText([...GLOBAL_MODE_LABELS]);
  });

  for (const mode of MODE_CASES) {
    test(`${mode.label}: 1カラムで盤面と星同士の関係を表示する`, async ({ page }) => {
      await page.goto(mode.path);

      await expect(page).toHaveTitle(new RegExp(mode.label));
      await expect(page.locator(".summary-panel h2")).toContainText(mode.label);
      await expect(page.locator(mode.boardSelector).first()).toBeVisible();
      await expect(page.locator(".relationship-map")).toBeVisible();
      await expect(page.locator(".relationship-map")).toContainText("星同士の関係");
      await expect(page.locator(".relationship-edge").first()).toBeVisible();
      await expect(page.locator(".relationship-map")).toContainText(/生じる|生じられる|剋す|剋される|同気|合|冲|刑|害|破|三合|空亡|月破/);
      await expect(page.locator(".element-badge").first()).toBeVisible();

      await expectOneGridTrack(page, ".workspace-grid");
      await expectOneGridTrack(page, ".board-canvas");
      await expectWuxingColors(page);
    });
  }

  test("5モードでコンソールエラーが出ない", async ({ page }) => {
    const errors = trackConsoleErrors(page);

    for (const mode of MODE_CASES) {
      await page.goto(mode.path);
      await expect(page.locator(".relationship-map")).toBeVisible();
    }

    expect(errors.filter((error) => !error.includes("favicon"))).toHaveLength(0);
  });

  test("フッターとヘッダーに公開UI向けの日本語ラベルが残る", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator(".app-header .eyebrow")).toHaveText("作盤ワークスペース");
    await expect(page.locator(".site-footer")).toContainText("書籍準拠");

    const footerText = (await page.locator(".site-footer").textContent()) ?? "";
    expect(footerText).not.toContain("試作");
    expect(footerText).not.toContain("API");
    expect(footerText).not.toContain("開発者向け");
  });
});
