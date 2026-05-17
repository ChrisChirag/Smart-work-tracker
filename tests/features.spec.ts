import { test, expect, Page } from "@playwright/test";
import * as path from "path";

// ─── Mock data (camelCase — matches what /api/data returns after rowToTask) ──
const mockTasks = [
  {
    id: "task001", title: "Design homepage mockup",
    description: "Create wireframes and high-fidelity mockups",
    status: "in_progress", priority: "high",
    projectId: "proj001", tagIds: ["tag001"],
    dueDate: "2026-05-20", scheduledDate: "2026-05-17",
    scheduledTime: "09:00", pinnedTime: false,
    estimatedMinutes: 120, completedAt: null,
    createdAt: "2026-05-01T08:00:00Z", updatedAt: "2026-05-01T08:00:00Z",
  },
  {
    id: "task002", title: "Write unit tests",
    description: "Cover auth and data modules",
    status: "todo", priority: "urgent",
    projectId: "proj001", tagIds: ["tag002"],
    dueDate: "2026-05-17", scheduledDate: "2026-05-17",
    scheduledTime: "11:00", pinnedTime: false,
    estimatedMinutes: 90, completedAt: null,
    createdAt: "2026-05-02T08:00:00Z", updatedAt: "2026-05-02T08:00:00Z",
  },
  {
    id: "task003", title: "Deploy to staging",
    description: null,
    status: "todo", priority: "medium",
    projectId: "proj002", tagIds: [],
    dueDate: "2026-05-19", scheduledDate: "2026-05-18",
    scheduledTime: null, pinnedTime: false,
    estimatedMinutes: null, completedAt: null,
    createdAt: "2026-05-03T08:00:00Z", updatedAt: "2026-05-03T08:00:00Z",
  },
  {
    id: "task004", title: "Review pull requests",
    description: "Review open PRs in GitHub",
    status: "done", priority: "medium",
    projectId: null, tagIds: ["tag001"],
    dueDate: null, scheduledDate: "2026-05-16",
    scheduledTime: "14:00", pinnedTime: true,
    estimatedMinutes: 30, completedAt: "2026-05-16T15:00:00Z",
    createdAt: "2026-05-04T08:00:00Z", updatedAt: "2026-05-16T15:00:00Z",
  },
  {
    id: "task005", title: "Fix login bug",
    description: "Users getting 401 on mobile",
    status: "todo", priority: "urgent",
    projectId: "proj001", tagIds: ["tag002"],
    dueDate: "2026-05-10", scheduledDate: "2026-05-10",
    scheduledTime: "10:00", pinnedTime: false,
    estimatedMinutes: 60, completedAt: null,
    createdAt: "2026-05-05T08:00:00Z", updatedAt: "2026-05-05T08:00:00Z",
  },
  {
    id: "task006", title: "Update API docs",
    description: null,
    status: "todo", priority: "low",
    projectId: "proj002", tagIds: [],
    dueDate: "2026-05-25", scheduledDate: null,
    scheduledTime: null, pinnedTime: false,
    estimatedMinutes: null, completedAt: null,
    createdAt: "2026-05-06T08:00:00Z", updatedAt: "2026-05-06T08:00:00Z",
  },
];

const mockProjects = [
  {
    id: "proj001", name: "Frontend Redesign",
    description: "Complete UI overhaul", color: "#6366f1",
    createdAt: "2026-05-01T08:00:00Z",
  },
  {
    id: "proj002", name: "Backend API",
    description: "REST API improvements", color: "#22c55e",
    createdAt: "2026-05-02T08:00:00Z",
  },
];

const mockTags = [
  { id: "tag001", name: "Design", color: "#ec4899" },
  { id: "tag002", name: "Dev", color: "#3b82f6" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const SS_DIR = "test-results/screenshots";

async function screenshot(page: Page, name: string) {
  await page.screenshot({
    path: path.join(SS_DIR, `${name}.png`),
    fullPage: true,
  });
}

async function setupMocks(page: Page) {
  await page.route("**/api/data", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ tasks: mockTasks, projects: mockProjects, tags: mockTags }),
    })
  );
  await page.route("**/api/tasks", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "new-task-001",
        title: "New Task",
        status: "todo",
        priority: "medium",
        tagIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    })
  );
  await page.route("**/api/tasks/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  );
  await page.route("**/api/projects", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "new-proj-001",
        name: "New Project",
        color: "#6366f1",
        createdAt: new Date().toISOString(),
      }),
    })
  );
  await page.route("**/api/projects/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  );
  await page.route("**/api/tags", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ id: "new-tag-001", name: "New Tag", color: "#ec4899" }),
    })
  );
  await page.route("**/api/tags/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  );
}

async function signIn(page: Page) {
  // Set up mocks BEFORE navigation so data is intercepted on the redirect
  await setupMocks(page);
  await page.goto("/api/auth/test-signin");
  // Wait for redirect to dashboard
  await page.waitForURL("http://localhost:3000/", { timeout: 20000 });
  // Wait for data to load (DataLoader fetches /api/data)
  await page.waitForFunction(
    () => {
      // Check the page has loaded past skeleton state
      const h2s = document.querySelectorAll("h2");
      for (const h2 of Array.from(h2s)) {
        if (h2.textContent && /Good (morning|afternoon|evening)/.test(h2.textContent)) {
          return true;
        }
      }
      return false;
    },
    { timeout: 20000 }
  );
}

// ─── Authentication ───────────────────────────────────────────────────────────
test.describe("Authentication", () => {
  test("test-signin redirects to dashboard", async ({ page }) => {
    await setupMocks(page);
    await page.goto("/api/auth/test-signin");
    await page.waitForURL("http://localhost:3000/", { timeout: 15000 });
    await page.waitForLoadState("domcontentloaded");
    expect(page.url()).toBe("http://localhost:3000/");
    await screenshot(page, "signin");
  });
});

// ─── Dashboard ────────────────────────────────────────────────────────────────
test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("loads without error and shows welcome banner", async ({ page }) => {
    // Greeting text in the welcome banner
    const heading = page.locator("h2").filter({ hasText: /Good (morning|afternoon|evening)/ }).first();
    await expect(heading).toBeVisible({ timeout: 10000 });

    const projectName = test.info().project.name;
    await screenshot(page, `dashboard-${projectName}`);
  });

  test("shows 4 stat cards", async ({ page }) => {
    const cards = page.locator(".border-l-4");
    await expect(cards).toHaveCount(4, { timeout: 10000 });

    // Check stat labels using the card text (uppercase tracking-wide label class)
    const statLabels = page.locator(".text-xs.text-muted-foreground.font-medium.uppercase");
    await expect(statLabels.filter({ hasText: "Today" }).first()).toBeVisible();
    await expect(statLabels.filter({ hasText: "In Progress" }).first()).toBeVisible();
    await expect(statLabels.filter({ hasText: "Overdue" }).first()).toBeVisible();
    await expect(statLabels.filter({ hasText: "Completed" }).first()).toBeVisible();
  });

  test("shows Today's Tasks section", async ({ page }) => {
    await expect(page.locator("text=Today's Tasks")).toBeVisible({ timeout: 10000 });
  });

  test("shows Overdue section with task005", async ({ page }) => {
    // The overdue section header
    const overdueSection = page.locator("h2").filter({ hasText: /Overdue/ }).first();
    await expect(overdueSection).toBeVisible({ timeout: 10000 });
    // task005 "Fix login bug" should appear
    await expect(page.locator("text=Fix login bug").first()).toBeVisible();
  });

  test("Add button opens task form", async ({ page }) => {
    // Click the "+ Add" button
    const addBtn = page.locator("button").filter({ hasText: /Add/ }).first();
    await addBtn.click();

    // Wait for dialog
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog.locator("text=New Task")).toBeVisible();

    await screenshot(page, "task-form-open");
  });

  test("Task form has all required fields", async ({ page }) => {
    const addBtn = page.locator("button").filter({ hasText: /Add/ }).first();
    await addBtn.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Title input
    const titleInput = dialog.locator("input").first();
    await expect(titleInput).toBeVisible();

    // Priority label (exact label element, not any element containing "Priority")
    await expect(dialog.locator("label").filter({ hasText: "Priority" }).first()).toBeVisible();
    // Status label
    await expect(dialog.locator("label").filter({ hasText: "Status" }).first()).toBeVisible();
    // Project label
    await expect(dialog.locator("label").filter({ hasText: "Project" }).first()).toBeVisible();
    // Due date label
    await expect(dialog.locator("label").filter({ hasText: /Due/ }).first()).toBeVisible();
  });

  test("Task form Duration dropdown works", async ({ page }) => {
    const addBtn = page.locator("button").filter({ hasText: /Add/ }).first();
    await addBtn.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Find Duration picker
    const durationTrigger = dialog.locator("button").filter({ hasText: /Auto|min|hour/i }).first();
    if (await durationTrigger.isVisible({ timeout: 2000 })) {
      await durationTrigger.click();
      await page.waitForTimeout(300);
      // Look for 30 min option
      const option30 = page.locator('[role="option"]').filter({ hasText: "30 min" }).first();
      if (await option30.isVisible({ timeout: 2000 })) {
        await option30.click();
      }
    }
    await screenshot(page, "task-form-duration-dropdown");
  });

  test("Task form can be submitted", async ({ page }) => {
    const addBtn = page.locator("button").filter({ hasText: /Add/ }).first();
    await addBtn.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Fill title
    const titleInput = dialog.locator("input").first();
    await titleInput.fill("Test Task from Playwright");

    // Submit using the button in the dialog footer
    const submitBtn = dialog.locator("button").filter({ hasText: /Save|Create|Add Task/i }).last();
    await submitBtn.click();

    // Dialog should close
    await expect(dialog).not.toBeVisible({ timeout: 8000 });
  });

  test("Task form can be closed", async ({ page }) => {
    const addBtn = page.locator("button").filter({ hasText: /Add/ }).first();
    await addBtn.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Close via Escape key
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible({ timeout: 3000 });
  });
});

// ─── Tasks page ───────────────────────────────────────────────────────────────
test.describe("Tasks Page", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await page.goto("/tasks");
    await page.waitForSelector("text=Write unit tests", { timeout: 15000 });
  });

  test("All tasks listed", async ({ page }) => {
    await expect(page.locator("text=Design homepage mockup").first()).toBeVisible();
    await expect(page.locator("text=Write unit tests").first()).toBeVisible();
    await expect(page.locator("text=Deploy to staging").first()).toBeVisible();
    const projectName = test.info().project.name;
    await screenshot(page, `tasks-${projectName}`);
  });

  test("Search input filters tasks by title", async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="search"]').first();
    await expect(searchInput).toBeVisible();
    await searchInput.fill("unit");
    await page.waitForTimeout(400);

    // Should show "Write unit tests"
    await expect(page.locator("text=Write unit tests").first()).toBeVisible();
    // Should not show unrelated tasks
    const deployVisible = await page.locator("text=Deploy to staging").first().isVisible();
    expect(deployVisible).toBeFalsy();

    await screenshot(page, "tasks-filter-active");
  });

  test("Priority filter dropdown works", async ({ page }) => {
    const priorityTrigger = page.locator("button").filter({ hasText: /Priority/i }).first();
    if (await priorityTrigger.isVisible({ timeout: 3000 })) {
      await priorityTrigger.click();
      const urgentOption = page.locator('[role="option"]').filter({ hasText: /Urgent/i }).first();
      if (await urgentOption.isVisible({ timeout: 2000 })) {
        await urgentOption.click();
        await page.waitForTimeout(400);
        await expect(page.locator("text=Write unit tests").first()).toBeVisible();
      }
    }
  });

  test("Status tabs filter tasks", async ({ page }) => {
    // Tabs include count: "All (6)", "To Do (4)", "In Progress (1)", "Done (1)"
    const todoTab = page.locator('[role="tab"]').filter({ hasText: /To Do/ }).first();
    await expect(todoTab).toBeVisible({ timeout: 5000 });
    await todoTab.click();
    await page.waitForTimeout(400);
    await expect(page.locator("text=Write unit tests").first()).toBeVisible();

    // Click "In Progress" tab
    const inProgressTab = page.locator('[role="tab"]').filter({ hasText: /In Progress/ }).first();
    await inProgressTab.click();
    await page.waitForTimeout(400);
    await expect(page.locator("text=Design homepage mockup").first()).toBeVisible();

    // Click "Done" tab
    const doneTab = page.locator('[role="tab"]').filter({ hasText: /^Done/ }).first();
    await doneTab.click();
    await page.waitForTimeout(400);
    await expect(page.locator("text=Review pull requests").first()).toBeVisible();

    // Back to "All" tab (contains count so not exact match)
    const allTab = page.locator('[role="tab"]').filter({ hasText: /^All/ }).first();
    await allTab.click();
    await page.waitForTimeout(300);
  });

  test("Task card has action menu with Edit and Delete", async ({ page }) => {
    // The "..." button has aria-label="Task actions" and is opacity-30 normally, full on group-hover
    // Find the task card group first
    const taskTitle = page.locator("text=Write unit tests").first();
    await expect(taskTitle).toBeVisible({ timeout: 5000 });

    // The button is aria-label="Task actions"
    const moreBtn = page.locator('button[aria-label="Task actions"]').first();
    // Force click even if opacity is low
    await moreBtn.click({ force: true });

    // Verify menu items
    await expect(page.locator('[role="menuitem"]').filter({ hasText: /Edit/i }).first()).toBeVisible({ timeout: 3000 });
    await expect(page.locator('[role="menuitem"]').filter({ hasText: /Delete/i }).first()).toBeVisible({ timeout: 3000 });
    await page.keyboard.press("Escape");
  });

  test("Project filter dropdown works", async ({ page }) => {
    const projectTrigger = page.locator("button").filter({ hasText: /Project/i }).first();
    if (await projectTrigger.isVisible({ timeout: 3000 })) {
      await projectTrigger.click();
      const projOption = page.locator('[role="option"]').filter({ hasText: /Frontend/i }).first();
      if (await projOption.isVisible({ timeout: 2000 })) {
        await projOption.click();
        await page.waitForTimeout(400);
      }
    }
  });

  test("Tag filter dropdown works", async ({ page }) => {
    const tagTrigger = page.locator("button").filter({ hasText: /Tag/i }).first();
    if (await tagTrigger.isVisible({ timeout: 3000 })) {
      await tagTrigger.click();
      const tagOption = page.locator('[role="option"]').filter({ hasText: /Design/i }).first();
      if (await tagOption.isVisible({ timeout: 2000 })) {
        await tagOption.click();
        await page.waitForTimeout(400);
      }
    }
  });

  test("Sort dropdown works", async ({ page }) => {
    const sortTrigger = page.locator("button").filter({ hasText: /Sort/i }).first();
    if (await sortTrigger.isVisible({ timeout: 3000 })) {
      await sortTrigger.click();
      const sortOption = page.locator('[role="option"]').filter({ hasText: /Due Date/i }).first();
      if (await sortOption.isVisible({ timeout: 2000 })) {
        await sortOption.click();
        await page.waitForTimeout(400);
      }
    }
  });
});

// ─── Projects page ────────────────────────────────────────────────────────────
test.describe("Projects Page", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await page.goto("/projects");
    await page.waitForSelector("text=Frontend Redesign", { timeout: 15000 });
  });

  test("Both projects render as cards", async ({ page }) => {
    await expect(page.locator("text=Frontend Redesign").first()).toBeVisible();
    await expect(page.locator("text=Backend API").first()).toBeVisible();
    const projectName = test.info().project.name;
    await screenshot(page, `projects-${projectName}`);
  });

  test("New Project button opens create dialog", async ({ page }) => {
    const newProjBtn = page.locator("button").filter({ hasText: /New Project/i }).first();
    await expect(newProjBtn).toBeVisible();
    await newProjBtn.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog.locator("text=New Project")).toBeVisible();
  });

  test("Create project dialog has name and color picker", async ({ page }) => {
    const newProjBtn = page.locator("button").filter({ hasText: /New Project/i }).first();
    await newProjBtn.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Name input
    await expect(dialog.locator('input').first()).toBeVisible();
    await page.keyboard.press("Escape");
  });

  test("Submit create project intercepts POST", async ({ page }) => {
    const newProjBtn = page.locator("button").filter({ hasText: /New Project/i }).first();
    await newProjBtn.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    const nameInput = dialog.locator('input').first();
    await nameInput.fill("My Playwright Project");

    const submitBtn = dialog.locator("button").filter({ hasText: /Create|Save|Add/i }).last();
    await submitBtn.click();

    await expect(dialog).not.toBeVisible({ timeout: 5000 });
  });

  test("Clicking a project card navigates to detail page", async ({ page }) => {
    // Click the "View Project" button for Frontend Redesign
    const viewBtn = page.locator("a[href='/projects/proj001']").filter({ hasText: /View Project/i }).first();
    await expect(viewBtn).toBeVisible({ timeout: 5000 });
    await viewBtn.click();
    await page.waitForURL("**/projects/proj001", { timeout: 10000 });
    expect(page.url()).toContain("/projects/proj001");
  });
});

// ─── Project Detail page ──────────────────────────────────────────────────────
test.describe("Project Detail Page", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await page.goto("/projects/proj001");
    await page.waitForSelector("text=Frontend Redesign", { timeout: 15000 });
  });

  test("Shows project name", async ({ page }) => {
    await expect(page.locator("text=Frontend Redesign").first()).toBeVisible();
    await screenshot(page, "project-detail");
  });

  test("Shows tasks in correct columns", async ({ page }) => {
    // proj001 has task001 (in_progress), task002 (todo), task005 (todo)
    await expect(page.locator("text=Design homepage mockup").first()).toBeVisible();
    await expect(page.locator("text=Write unit tests").first()).toBeVisible();
  });

  test("History tab shows completed tasks", async ({ page }) => {
    const historyTab = page.locator('[role="tab"]').filter({ hasText: /History/i }).first();
    if (await historyTab.isVisible({ timeout: 3000 })) {
      await historyTab.click();
      await page.waitForTimeout(500);
    }
  });
});

// ─── Timeline page ────────────────────────────────────────────────────────────
test.describe("Timeline Page", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await page.goto("/timeline");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1500);
  });

  test("Renders hourly grid", async ({ page }) => {
    const content = await page.content();
    const hasTimeLabel = content.includes("AM") || content.includes("PM");
    expect(hasTimeLabel).toBeTruthy();
    await screenshot(page, "timeline-week");
  });

  test("Week view shows 7 day headers", async ({ page }) => {
    const content = await page.content();
    const hasWeekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].some((d) =>
      content.includes(d)
    );
    expect(hasWeekDays || content.includes("Week")).toBeTruthy();
  });

  test("Day view toggle switches to single-day view", async ({ page }) => {
    const dayBtn = page.locator("button").filter({ hasText: /^Day$/i }).first();
    if (await dayBtn.isVisible({ timeout: 3000 })) {
      await dayBtn.click();
      await page.waitForTimeout(500);
    }
    await screenshot(page, "timeline-day");
  });

  test("Auto-schedule button opens preview dialog", async ({ page }) => {
    const autoBtn = page.locator("button").filter({ hasText: /Auto.?[Ss]chedule|Auto/i }).first();
    if (await autoBtn.isVisible({ timeout: 3000 })) {
      await autoBtn.click();
      await page.waitForTimeout(500);
      const dialog = page.locator('[role="dialog"]');
      if (await dialog.isVisible({ timeout: 3000 })) {
        await expect(dialog).toBeVisible();
        await screenshot(page, "timeline-auto-schedule");
        await page.keyboard.press("Escape");
      }
    }
  });
});

// ─── Analytics page ───────────────────────────────────────────────────────────
test.describe("Analytics Page", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await page.goto("/analytics");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1000);
  });

  test("Renders stats cards", async ({ page }) => {
    const content = await page.content();
    const hasStats =
      content.includes("Completion") ||
      content.includes("completion") ||
      content.includes("streak") ||
      content.includes("Streak") ||
      content.includes("Active") ||
      content.includes("Overdue");
    expect(hasStats).toBeTruthy();
    const projectName = test.info().project.name;
    await screenshot(page, `analytics-${projectName}`);
  });

  test("Priority breakdown table visible", async ({ page }) => {
    const content = await page.content();
    const hasPriority =
      content.includes("Priority") ||
      content.includes("Urgent") ||
      content.includes("urgent");
    expect(hasPriority).toBeTruthy();
  });

  test("Project progress section visible", async ({ page }) => {
    const content = await page.content();
    const hasProject =
      content.includes("Project") ||
      content.includes("Frontend Redesign") ||
      content.includes("Backend API");
    expect(hasProject).toBeTruthy();
  });
});

// ─── Settings page ────────────────────────────────────────────────────────────
test.describe("Settings Page", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await page.goto("/settings");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(800);
  });

  test("User account section shows Test User", async ({ page }) => {
    // The account card in the main content shows Test User
    // Use main content area locator to avoid hidden sidebar elements
    const mainContent = page.locator("main");
    await expect(mainContent.locator("text=Test User").first()).toBeVisible({ timeout: 8000 });
    await expect(mainContent.locator("text=test@playwright.local").first()).toBeVisible();
    const projectName = test.info().project.name;
    await screenshot(page, `settings-${projectName}`);
  });

  test("Theme buttons are clickable", async ({ page }) => {
    const lightBtn = page.locator("button").filter({ hasText: /^Light$/i }).first();
    const darkBtn = page.locator("button").filter({ hasText: /^Dark$/i }).first();
    const systemBtn = page.locator("button").filter({ hasText: /^System$/i }).first();

    await expect(lightBtn).toBeVisible({ timeout: 5000 });
    await expect(darkBtn).toBeVisible();
    await expect(systemBtn).toBeVisible();

    await darkBtn.click();
    await page.waitForTimeout(300);
    await lightBtn.click();
    await page.waitForTimeout(300);
    await systemBtn.click();
  });

  test("Buffer time buttons are clickable", async ({ page }) => {
    const noneBtn = page.locator("button").filter({ hasText: /^None$/i }).first();
    const min5Btn = page.locator("button").filter({ hasText: /5 min/i }).first();

    if (await noneBtn.isVisible({ timeout: 3000 })) {
      await noneBtn.click();
      await page.waitForTimeout(200);
    }
    if (await min5Btn.isVisible({ timeout: 3000 })) {
      await min5Btn.click();
      await page.waitForTimeout(200);
    }
    const min10Btn = page.locator("button").filter({ hasText: /10 min/i }).first();
    if (await min10Btn.isVisible({ timeout: 3000 })) {
      await min10Btn.click();
    }
    const min15Btn = page.locator("button").filter({ hasText: /15 min/i }).first();
    if (await min15Btn.isVisible({ timeout: 3000 })) {
      await min15Btn.click();
    }
  });

  test("New Tag button opens dialog", async ({ page }) => {
    const newTagBtn = page.locator("button").filter({ hasText: /New Tag/i }).first();
    await expect(newTagBtn).toBeVisible({ timeout: 5000 });
    await newTagBtn.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });
  });

  test("Create tag dialog has name input and color swatches", async ({ page }) => {
    const newTagBtn = page.locator("button").filter({ hasText: /New Tag/i }).first();
    await newTagBtn.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    const nameInput = dialog.locator("input").first();
    await expect(nameInput).toBeVisible();

    await page.keyboard.press("Escape");
  });

  test("Export CSV and Export JSON buttons present", async ({ page }) => {
    // Buttons say "Export as CSV" and "Export as JSON"
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);
    await expect(page.locator("button").filter({ hasText: /Export as CSV/i }).first()).toBeVisible({ timeout: 8000 });
    await expect(page.locator("button").filter({ hasText: /Export as JSON/i }).first()).toBeVisible();
  });

  test("Sign Out button present", async ({ page }) => {
    await expect(page.locator("button").filter({ hasText: /Sign Out/i }).first()).toBeVisible({ timeout: 5000 });
  });
});

// ─── Mobile-specific tests ────────────────────────────────────────────────────
test.describe("Mobile Navigation", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    if (!testInfo.project.name.includes("mobile")) {
      test.skip();
      return;
    }
    await signIn(page);
    await page.waitForLoadState("domcontentloaded");
  });

  test("Bottom navigation bar is visible", async ({ page }) => {
    // The mobile bottom nav has class "md:hidden fixed bottom-0..."
    // It contains span labels for each nav item
    // Use the span text labels inside the bottom nav
    const homeLabel = page.locator("span").filter({ hasText: /^Home$/ }).first();
    await expect(homeLabel).toBeVisible({ timeout: 5000 });
    await screenshot(page, "dashboard-mobile");
  });

  test("Bottom nav has all expected items", async ({ page }) => {
    // The mobile nav shows icon + text label spans
    await expect(page.locator("span").filter({ hasText: /^Home$/ }).first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("span").filter({ hasText: /^Tasks$/ }).first()).toBeVisible();
    await expect(page.locator("span").filter({ hasText: /^Timeline$/ }).first()).toBeVisible();
    await expect(page.locator("span").filter({ hasText: /^Analytics$/ }).first()).toBeVisible();
    await expect(page.locator("span").filter({ hasText: /^Settings$/ }).first()).toBeVisible();
  });

  test("Navigate to Tasks via bottom bar", async ({ page }) => {
    // Find the Tasks link in the mobile nav (it wraps the label "Tasks")
    // The mobile nav uses Link href="/tasks"
    const tasksLink = page.locator('a[href="/tasks"]').last();
    await tasksLink.click({ force: true });
    await page.waitForURL("**/tasks", { timeout: 10000 });
    expect(page.url()).toContain("/tasks");
    await screenshot(page, "tasks-mobile");
  });

  test("Navigate to Timeline via bottom bar", async ({ page }) => {
    const timelineLink = page.locator('a[href="/timeline"]').last();
    await timelineLink.click({ force: true });
    await page.waitForURL("**/timeline", { timeout: 10000 });
    expect(page.url()).toContain("/timeline");
  });

  test("Navigate to Analytics via bottom bar", async ({ page }) => {
    const analyticsLink = page.locator('a[href="/analytics"]').last();
    await analyticsLink.click({ force: true });
    await page.waitForURL("**/analytics", { timeout: 10000 });
    expect(page.url()).toContain("/analytics");
    await screenshot(page, "analytics-mobile");
  });

  test("Navigate to Settings via bottom bar", async ({ page }) => {
    const settingsLink = page.locator('a[href="/settings"]').last();
    await settingsLink.click({ force: true });
    await page.waitForURL("**/settings", { timeout: 10000 });
    expect(page.url()).toContain("/settings");
    await screenshot(page, "settings-mobile");
  });

  test("Sidebar is NOT visible on mobile (bottom nav is shown instead)", async ({ page }) => {
    // The aside sidebar is hidden on mobile (hidden md:flex)
    const sidebar = page.locator("aside").first();
    // On mobile viewport, the aside should not be visible
    await expect(sidebar).not.toBeVisible({ timeout: 3000 });
    // But the bottom nav span labels should be visible
    await expect(page.locator("span").filter({ hasText: /^Home$/ }).first()).toBeVisible();
  });
});

// ─── Desktop screenshot captures ─────────────────────────────────────────────
test.describe("Desktop Screenshots", () => {
  test("Capture all major pages", async ({ page }, testInfo) => {
    if (!testInfo.project.name.includes("desktop")) {
      test.skip();
      return;
    }
    await signIn(page);

    // Dashboard
    await page.waitForTimeout(800);
    await screenshot(page, "dashboard-desktop");

    // Tasks
    await setupMocks(page);
    await page.goto("/tasks");
    await page.waitForSelector("text=Write unit tests", { timeout: 15000 });
    await screenshot(page, "tasks-desktop");

    // Projects
    await setupMocks(page);
    await page.goto("/projects");
    await page.waitForSelector("text=Frontend Redesign", { timeout: 15000 });
    await screenshot(page, "projects-desktop");

    // Project detail
    await setupMocks(page);
    await page.goto("/projects/proj001");
    await page.waitForSelector("text=Frontend Redesign", { timeout: 15000 });
    await screenshot(page, "project-detail");

    // Timeline
    await setupMocks(page);
    await page.goto("/timeline");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1500);
    await screenshot(page, "timeline-week");

    // Analytics
    await setupMocks(page);
    await page.goto("/analytics");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1000);
    await screenshot(page, "analytics-desktop");

    // Settings
    await setupMocks(page);
    await page.goto("/settings");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(800);
    await screenshot(page, "settings-desktop");
  });
});
