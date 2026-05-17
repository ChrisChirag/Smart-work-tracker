/**
 * Persistence & project-linking tests.
 *
 * These tests verify the exact scenarios the user reported:
 *  1. Add multiple tasks → refresh → tasks survive
 *  2. Add more tasks after refresh → refresh again → tasks survive
 *  3. Add tasks inside a project → refresh → tasks & project survive
 *  4. Even when the POST/Sync fails, localStorage keeps the data alive
 *
 * API calls are intercepted at the browser level so no real Supabase needed.
 */

import { test, expect, Page } from "@playwright/test";

// ─── Shared mock data ────────────────────────────────────────────────────────

const PROJ1 = {
  id: "proj-alpha",
  name: "Alpha Project",
  description: "First project",
  color: "#6366f1",
  createdAt: "2026-05-01T08:00:00Z",
};

const PROJ2 = {
  id: "proj-beta",
  name: "Beta Project",
  description: "Second project",
  color: "#22c55e",
  createdAt: "2026-05-02T08:00:00Z",
};

function makeTask(i: number, projectId?: string) {
  return {
    id: `seed-task-${i}`,
    title: `Seed Task ${i}`,
    description: null,
    status: "todo",
    priority: "medium",
    projectId: projectId ?? null,
    tagIds: [],
    dueDate: null,
    scheduledDate: "2026-05-17",
    scheduledTime: null,
    pinnedTime: false,
    estimatedMinutes: null,
    completedAt: null,
    createdAt: "2026-05-01T08:00:00Z",
    updatedAt: "2026-05-01T08:00:00Z",
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Wire up route mocks. serverTasks / serverProjects are what /api/data returns
 * (simulates what's actually persisted in Supabase). POST always succeeds by
 * default; pass failPost=true to simulate a server error.
 */
async function setupMocks(
  page: Page,
  opts: {
    serverTasks?: object[];
    serverProjects?: object[];
    failPost?: boolean;
  } = {}
) {
  const { serverTasks = [], serverProjects = [], failPost = false } = opts;

  await page.route("/api/data", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ tasks: serverTasks, projects: serverProjects, tags: [] }),
    })
  );

  await page.route("/api/tasks", (route) => {
    if (route.request().method() === "POST") {
      if (failPost) {
        return route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "relation \"tasks\" does not exist" }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: "new-id-" + Date.now() }),
      });
    }
    route.continue();
  });

  await page.route("/api/tasks/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  );

  await page.route("/api/projects", (route) => {
    if (route.request().method() === "POST") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: "new-proj-" + Date.now() }),
      });
    }
    route.continue();
  });

  await page.route("/api/projects/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  );

  await page.route("/api/tags", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  );
  await page.route("/api/tags/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  );
}

/** Authenticate via the test-signin bypass and land on the dashboard. */
async function signIn(page: Page) {
  await page.goto("/api/auth/test-signin");
  await page.waitForURL("/");
  await page.waitForLoadState("networkidle");
}

/** Open the New Task form from the header, fill title + optional project, submit. */
async function addTask(
  page: Page,
  title: string,
  projectName?: string
) {
  // Use header "New Task" button (visible on every page)
  await page.locator("header button:has-text('New Task')").click();
  const dialog = page.locator("[role='dialog']");
  await expect(dialog).toBeVisible();

  await dialog.locator("input#title").fill(title);

  if (projectName) {
    // The project SelectTrigger shows "No project" as its placeholder text
    await dialog.locator("button[role='combobox']:has-text('No project')").click();
    await page.locator("[role='option']").filter({ hasText: projectName }).click();
  }

  await dialog.locator("button[type='submit']").click();
  await expect(dialog).not.toBeVisible({ timeout: 5000 });
}

/** Hard-reload the page and wait for it to be ready. */
async function hardReload(page: Page) {
  await page.reload();
  await page.waitForLoadState("networkidle");
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe("Task & project persistence across page refreshes", () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage between tests so each test starts fresh
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("work-tracker-store"));
  });

  // ── 1. Add tasks → refresh → tasks still there ────────────────────────────
  test("tasks survive a page refresh (localStorage persistence)", async ({ page }) => {
    await setupMocks(page, { serverTasks: [], serverProjects: [] });
    await signIn(page);

    // Add 3 tasks
    await addTask(page, "Persistent Task A");
    await addTask(page, "Persistent Task B");
    await addTask(page, "Persistent Task C");

    // Verify all 3 visible before refresh
    await expect(page.locator("text=Persistent Task A")).toBeVisible();
    await expect(page.locator("text=Persistent Task B")).toBeVisible();
    await expect(page.locator("text=Persistent Task C")).toBeVisible();

    await page.screenshot({ path: "test-results/screenshots/persist-before-refresh.png", fullPage: true });

    // Refresh — /api/data still returns empty (simulates tasks not yet in Supabase)
    await setupMocks(page, { serverTasks: [], serverProjects: [] });
    await hardReload(page);

    // Tasks must still be there (from localStorage merge)
    await expect(page.locator("text=Persistent Task A")).toBeVisible({ timeout: 8000 });
    await expect(page.locator("text=Persistent Task B")).toBeVisible({ timeout: 8000 });
    await expect(page.locator("text=Persistent Task C")).toBeVisible({ timeout: 8000 });

    await page.screenshot({ path: "test-results/screenshots/persist-after-refresh.png", fullPage: true });
  });

  // ── 2. Add → refresh → add more → refresh again ───────────────────────────
  test("multiple add-then-refresh cycles accumulate tasks correctly", async ({ page }) => {
    await setupMocks(page, { serverTasks: [], serverProjects: [] });
    await signIn(page);

    // Round 1
    await addTask(page, "Round 1 Task X");
    await addTask(page, "Round 1 Task Y");

    await setupMocks(page, { serverTasks: [], serverProjects: [] });
    await hardReload(page);

    await expect(page.locator("text=Round 1 Task X")).toBeVisible({ timeout: 8000 });
    await expect(page.locator("text=Round 1 Task Y")).toBeVisible({ timeout: 8000 });

    await page.screenshot({ path: "test-results/screenshots/multi-cycle-after-round1.png", fullPage: true });

    // Round 2 — add more tasks
    await addTask(page, "Round 2 Task P");
    await addTask(page, "Round 2 Task Q");

    await setupMocks(page, { serverTasks: [], serverProjects: [] });
    await hardReload(page);

    // ALL four tasks must be present
    await expect(page.locator("text=Round 1 Task X")).toBeVisible({ timeout: 8000 });
    await expect(page.locator("text=Round 1 Task Y")).toBeVisible({ timeout: 8000 });
    await expect(page.locator("text=Round 2 Task P")).toBeVisible({ timeout: 8000 });
    await expect(page.locator("text=Round 2 Task Q")).toBeVisible({ timeout: 8000 });

    await page.screenshot({ path: "test-results/screenshots/multi-cycle-after-round2.png", fullPage: true });
  });

  // ── 3. Add task inside a project → refresh → task still linked to project ─
  test("task assigned to a project survives refresh and stays in project", async ({ page }) => {
    // Pre-seed two projects in the store via /api/data
    await setupMocks(page, { serverTasks: [], serverProjects: [PROJ1, PROJ2] });
    await signIn(page);

    // Add a task linked to Alpha Project
    await addTask(page, "Alpha-linked Task", "Alpha Project");

    // Verify on dashboard
    await expect(page.locator("text=Alpha-linked Task")).toBeVisible();

    // Navigate to the project detail page
    await page.goto("/projects");
    await page.waitForLoadState("networkidle");
    await page.locator(`a[href='/projects/${PROJ1.id}']`).click();
    await page.waitForLoadState("networkidle");

    // Task should be in the project board
    await expect(page.locator("text=Alpha-linked Task")).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: "test-results/screenshots/task-in-project-before-refresh.png", fullPage: true });

    // Refresh
    await setupMocks(page, { serverTasks: [], serverProjects: [PROJ1, PROJ2] });
    await hardReload(page);

    // Task must still be there and linked to the project
    await expect(page.locator("text=Alpha-linked Task")).toBeVisible({ timeout: 8000 });

    await page.screenshot({ path: "test-results/screenshots/task-in-project-after-refresh.png", fullPage: true });
  });

  // ── 4. Multiple tasks across two projects → refresh ───────────────────────
  test("tasks across multiple projects all survive refresh", async ({ page }) => {
    await setupMocks(page, { serverTasks: [], serverProjects: [PROJ1, PROJ2] });
    await signIn(page);

    await addTask(page, "Alpha Task 1", "Alpha Project");
    await addTask(page, "Alpha Task 2", "Alpha Project");
    await addTask(page, "Beta Task 1", "Beta Project");
    await addTask(page, "Unlinked Task");

    // Verify all visible
    for (const title of ["Alpha Task 1", "Alpha Task 2", "Beta Task 1", "Unlinked Task"]) {
      await expect(page.locator(`text=${title}`)).toBeVisible();
    }

    await page.screenshot({ path: "test-results/screenshots/multi-project-before-refresh.png", fullPage: true });

    // Refresh
    await setupMocks(page, { serverTasks: [], serverProjects: [PROJ1, PROJ2] });
    await hardReload(page);

    for (const title of ["Alpha Task 1", "Alpha Task 2", "Beta Task 1", "Unlinked Task"]) {
      await expect(page.locator(`text=${title}`)).toBeVisible({ timeout: 8000 });
    }

    await page.screenshot({ path: "test-results/screenshots/multi-project-after-refresh.png", fullPage: true });

    // Navigate to Alpha project and verify correct tasks
    await page.goto("/projects");
    await page.waitForLoadState("networkidle");
    await page.locator(`a[href='/projects/${PROJ1.id}']`).click();
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=Alpha Task 1")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Alpha Task 2")).toBeVisible({ timeout: 5000 });
    // Beta and Unlinked should NOT be in Alpha project
    await expect(page.locator("text=Beta Task 1")).not.toBeVisible();
    await expect(page.locator("text=Unlinked Task")).not.toBeVisible();

    await page.screenshot({ path: "test-results/screenshots/alpha-project-after-refresh.png", fullPage: true });
  });

  // ── 5. Sync fails → task still survives refresh (the core bug fix) ─────────
  test("task survives refresh even when the POST to Supabase fails", async ({ page }) => {
    // POST returns 500 — simulates the exact error the user sees
    await setupMocks(page, { serverTasks: [], serverProjects: [], failPost: true });
    await signIn(page);

    await addTask(page, "Survives Even On Failure");

    // Optimistic update — task visible immediately
    await expect(page.locator("text=Survives Even On Failure")).toBeVisible();

    // Toast should say "Save failed: ..." (not the old generic message)
    await expect(page.locator("text=Save failed")).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: "test-results/screenshots/sync-fail-before-refresh.png", fullPage: true });

    // Refresh — /api/data still returns empty (POST never persisted)
    await setupMocks(page, { serverTasks: [], serverProjects: [], failPost: true });
    await hardReload(page);

    // Task must STILL be there thanks to localStorage + merge
    await expect(page.locator("text=Survives Even On Failure")).toBeVisible({ timeout: 8000 });

    await page.screenshot({ path: "test-results/screenshots/sync-fail-after-refresh.png", fullPage: true });
  });

  // ── 6. Tasks from server + locally-added tasks both appear after refresh ───
  test("server tasks and locally-added tasks coexist after refresh", async ({ page }) => {
    // Server already has 2 tasks
    const serverTask1 = makeTask(1);
    const serverTask2 = makeTask(2);

    await setupMocks(page, {
      serverTasks: [serverTask1, serverTask2],
      serverProjects: [PROJ1],
    });
    await signIn(page);

    // Verify server tasks loaded
    await expect(page.locator("text=Seed Task 1")).toBeVisible({ timeout: 8000 });
    await expect(page.locator("text=Seed Task 2")).toBeVisible({ timeout: 8000 });

    // Add a new local task
    await addTask(page, "Freshly Added Local Task", "Alpha Project");
    await expect(page.locator("text=Freshly Added Local Task")).toBeVisible();

    await page.screenshot({ path: "test-results/screenshots/mixed-before-refresh.png", fullPage: true });

    // Refresh — server still has only the seed tasks
    await setupMocks(page, {
      serverTasks: [serverTask1, serverTask2],
      serverProjects: [PROJ1],
    });
    await hardReload(page);

    // All three tasks visible
    await expect(page.locator("text=Seed Task 1")).toBeVisible({ timeout: 8000 });
    await expect(page.locator("text=Seed Task 2")).toBeVisible({ timeout: 8000 });
    await expect(page.locator("text=Freshly Added Local Task")).toBeVisible({ timeout: 8000 });

    await page.screenshot({ path: "test-results/screenshots/mixed-after-refresh.png", fullPage: true });
  });
});
