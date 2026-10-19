import { test, expect, Page } from '@playwright/test';

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function loginAsAdmin(page: Page) {
    await page.goto('/pt/login');
    await page.waitForLoadState('domcontentloaded');

    // Fill email & password (any password works for mock auth)
    await page.locator('input[type="email"]').fill('admin@safesite.com');
    await page.locator('input[type="password"]').fill('password');

    // Click Sign In button
    await page.locator('button[type="submit"]').click();

    // After login, app redirects to "/" then likely /pt/dashboard or /pt/project list
    await page.waitForURL(url => !url.href.includes('/login'), { timeout: 20000 });

    // Wait for the store to initialize (DB init can take a moment)
    await page.waitForTimeout(4000);
}

async function goToProject(page: Page, section: string) {
    await page.goto(`/pt/project/proj_1/${section}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
}

// ─── Authentication ───────────────────────────────────────────────────────────

test.describe('Authentication', () => {
    test('should display login form elements', async ({ page }) => {
        await page.goto('/pt/login');
        await expect(page.locator('input[type="email"]')).toBeVisible();
        await expect(page.locator('input[type="password"]')).toBeVisible();
        await expect(page.locator('button[type="submit"]').filter({ hasText: /Sign In/i })).toBeVisible();
    });

    test('should login successfully with admin credentials', async ({ page }) => {
        await page.goto('/pt/login');
        await page.locator('input[type="email"]').fill('admin@safesite.com');
        await page.locator('input[type="password"]').fill('password');
        await page.locator('button[type="submit"]').click();
        await expect(page).not.toHaveURL(/login/, { timeout: 15000 });
    });

    test('should show error for invalid email', async ({ page }) => {
        await page.goto('/pt/login');
        await page.locator('input[type="email"]').fill('invalid@test.com');
        await page.locator('input[type="password"]').fill('wrongpassword');
        await page.locator('button[type="submit"]').click();
        // Should still be on login page with an error message visible
        await expect(page.locator('text=Invalid email')).toBeVisible({ timeout: 5000 });
    });
});

// ─── Company Management ───────────────────────────────────────────────────────

test.describe('Company Management', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
        await goToProject(page, 'companies');
    });

    test('should display companies list page', async ({ page }) => {
        // Page heading with company/organizations text
        const heading = page.locator('h2, h1').first();
        await expect(heading).toBeVisible({ timeout: 10000 });
    });

    test('should show existing company rows (seeded data)', async ({ page }) => {
        // After DB seed, mock companies should be visible
        const rows = page.locator('tbody tr').first();
        await expect(rows).toBeVisible({ timeout: 10000 });
    });

    test('should open Add Company modal', async ({ page }) => {
        const addBtn = page.locator('button').filter({ hasText: /Nova|Add|Adicionar|Create/i }).first();
        await expect(addBtn).toBeVisible({ timeout: 8000 });
        await addBtn.click();
        // A dialog/modal should appear
        await expect(page.locator('[role="dialog"]').first()).toBeVisible({ timeout: 5000 });
    });
});

// ─── Worker Management ────────────────────────────────────────────────────────

test.describe('Worker Management', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
        await goToProject(page, 'workers');
    });

    test('should display workers list page', async ({ page }) => {
        const heading = page.locator('h2, h1').first();
        await expect(heading).toBeVisible({ timeout: 10000 });
    });

    test('should show existing worker rows (seeded data)', async ({ page }) => {
        const rows = page.locator('tbody tr, [class*="worker-card"]').first();
        await expect(rows).toBeVisible({ timeout: 10000 });
    });

    test('should open Add Worker modal or panel', async ({ page }) => {
        const addBtn = page.locator('button').filter({ hasText: /Novo|Add|Adicionar|Create/i }).first();
        await expect(addBtn).toBeVisible({ timeout: 8000 });
        await addBtn.click();
        // Modal or side panel
        const dialog = page.locator('[role="dialog"], aside, [class*="drawer"]').first();
        await expect(dialog).toBeVisible({ timeout: 5000 });
    });
});

// ─── Equipment Management ─────────────────────────────────────────────────────

test.describe('Equipment Management', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
        await goToProject(page, 'equipment');
    });

    test('should display equipment list page', async ({ page }) => {
        const heading = page.locator('h2, h1').first();
        await expect(heading).toBeVisible({ timeout: 10000 });
    });

    test('should show existing equipment rows (seeded data)', async ({ page }) => {
        const rows = page.locator('tbody tr').first();
        await expect(rows).toBeVisible({ timeout: 10000 });
    });

    test('should open Add Equipment modal', async ({ page }) => {
        const addBtn = page.locator('button').filter({ hasText: /Novo|Add|Adicionar|Create/i }).first();
        await expect(addBtn).toBeVisible({ timeout: 8000 });
        await addBtn.click();
        await expect(page.locator('[role="dialog"]').first()).toBeVisible({ timeout: 5000 });
    });
});

// ─── Safety Incidents ─────────────────────────────────────────────────────────

test.describe('Safety Incidents', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
        await goToProject(page, 'accidents');
    });

    test('should show Safety & Risks page', async ({ page }) => {
        // The header now says "Safety & Risks"
        await expect(page.locator('h2:has-text("Safety"), h2:has-text("Risks")')).toBeVisible({ timeout: 10000 });
    });

    test('should have Incidents and Risk Assessments tabs', async ({ page }) => {
        await expect(page.locator('button:has-text("Incidents")')).toBeVisible({ timeout: 8000 });
        await expect(page.locator('button:has-text("Risk Assessment")')).toBeVisible({ timeout: 8000 });
    });

    test('should display seeded incidents', async ({ page }) => {
        // Wait a bit for DB seed: there are 6 mock accidents
        const cards = page.locator('[class*="rounded-xl"]').filter({ hasText: /Severity|severity/i });
        await expect(cards.first()).toBeVisible({ timeout: 10000 });
    });

    test('should open Report Incident modal', async ({ page }) => {
        await page.locator('button:has-text("Report Incident")').click();
        const dialog = page.locator('[role="dialog"]').first();
        await expect(dialog).toBeVisible({ timeout: 5000 });
        // Verify IFC field is visible
        await expect(dialog.locator('label:has-text("IFC")')).toBeVisible({ timeout: 5000 });
    });

    test('should create new Safety Incident with IFC GlobalId', async ({ page }) => {
        await page.locator('button:has-text("Report Incident")').click();
        const dialog = page.locator('[role="dialog"]').first();
        await expect(dialog).toBeVisible({ timeout: 5000 });

        // Fill title
        await dialog.locator('input[placeholder="Brief summary of event"]').fill('Teste E2E - Queda de Fachada');

        // Date
        await dialog.locator('input[type="date"]').fill('2026-03-10');

        // Select location (first non-empty option)
        const locationSelect = dialog.locator('select').first();
        await locationSelect.selectOption({ index: 1 });

        // Severity — already defaults OK

        // IFC GlobalId
        await dialog.locator('input[placeholder*="IFC"]').fill('0xyz_Test_IFC_GUID');

        // Mitigation measures
        await dialog.locator('textarea').first().fill('EPI obrigatório, sinalização reforçada.');

        // Description
        await dialog.locator('textarea').last().fill('Queda de material durante manutenção. Teste E2E criado pelo Playwright.');

        // Submit
        await dialog.locator('button[type="submit"]').click();

        // Dialog should close
        await expect(dialog).not.toBeVisible({ timeout: 8000 });

        // New card should appear in the grid
        await expect(page.getByText('Teste E2E - Queda de Fachada')).toBeVisible({ timeout: 5000 });
    });

    test('should switch to Risk Assessments tab', async ({ page }) => {
        await page.locator('button:has-text("Risk Assessment")').click();
        // "Add Risk" button should now appear
        await expect(page.locator('button:has-text("Add Risk")')).toBeVisible({ timeout: 5000 });
    });
});

// ─── Risk Assessments ─────────────────────────────────────────────────────────

test.describe('Risk Assessments', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
        await goToProject(page, 'accidents');
        // Switch to risk tab
        await page.locator('button:has-text("Risk Assessment")').click();
        await page.waitForTimeout(500);
    });

    test('should show empty risk list initially', async ({ page }) => {
        // May be empty since we don't seed risk assessments
        await expect(page.locator('button:has-text("Add Risk")')).toBeVisible({ timeout: 5000 });
    });

    test('should open Add Risk modal with IFC field', async ({ page }) => {
        await page.locator('button:has-text("Add Risk")').click();
        const dialog = page.locator('[role="dialog"]').first();
        await expect(dialog).toBeVisible({ timeout: 5000 });
        // Verify IFC GlobalId label exists
        await expect(dialog.locator('label:has-text("IFC")')).toBeVisible({ timeout: 5000 });
    });

    test('should create a Risk Assessment', async ({ page }) => {
        await page.locator('button:has-text("Add Risk")').click();
        const dialog = page.locator('[role="dialog"]').first();
        await expect(dialog).toBeVisible({ timeout: 5000 });

        // Risk name
        await dialog.locator('input[placeholder*="height"], input[placeholder*="E.g."]').first().fill('Risco E2E - Trabalho em Altura');

        // Risk type
        await dialog.locator('input[type="text"]').nth(1).fill('Physical');

        // Unmitigated: High
        await dialog.locator('select').nth(0).selectOption('High');
        // Mitigated: Low
        await dialog.locator('select').nth(1).selectOption('Low');

        // Mitigation measures
        await dialog.locator('textarea').fill('Arnês, capacete, inspeção diária do andaime. Reforço de sinalização.');

        // IFC GlobalId
        await dialog.locator('input[placeholder*="IFC"], input[placeholder*="2Qw"]').fill('1AB2CD_IFCGuid_Playwright');

        // Submit
        await dialog.locator('button[type="submit"]').click();
        await expect(dialog).not.toBeVisible({ timeout: 8000 });

        // Risk should be visible in the list
        await expect(page.getByText('Risco E2E - Trabalho em Altura')).toBeVisible({ timeout: 5000 });
    });

    test('should delete a Risk Assessment', async ({ page }) => {
        // Create one first
        await page.locator('button:has-text("Add Risk")').click();
        const dialog = page.locator('[role="dialog"]').first();
        await dialog.locator('input[type="text"]').first().fill('Risco Para Eliminar');
        await dialog.locator('button[type="submit"]').click();
        await expect(dialog).not.toBeVisible({ timeout: 8000 });

        // Now find the trash button in the card
        const card = page.locator('[class*="rounded-xl"]').filter({ hasText: 'Risco Para Eliminar' }).first();
        await card.hover();
        // Trash button (last button in card)
        const trashBtn = card.locator('button').last();
        await trashBtn.click();

        // Confirm in the dialog
        const confirmBtn = page.locator('button').filter({ hasText: /Delete|Confirmar/i }).last();
        if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await confirmBtn.click();
        }

        await expect(page.getByText('Risco Para Eliminar')).not.toBeVisible({ timeout: 5000 });
    });

    test('should switch back to Incidents tab', async ({ page }) => {
        await page.locator('button:has-text("Incidents")').click();
        await expect(page.locator('button:has-text("Report Incident")')).toBeVisible({ timeout: 5000 });
    });
});
