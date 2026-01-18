import { test, expect } from '@playwright/test';

test.describe('Transaction Workflow', () => {
    // Login before each test
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.getByPlaceholder('name@company.com').fill('admin@acme.com');
        await page.getByPlaceholder('••••••••').fill('Password123!');
        await page.getByRole('button', { name: 'Sign In' }).click();
        await expect(page).toHaveURL('/dashboard');
    });

    test('should create a new expense transaction', async ({ page }) => {
        // Navigate to transactions page
        await page.goto('/transactions');

        // Open create dialog
        await page.getByRole('button', { name: 'Add Transaction' }).click();

        // Fill Amount
        await page.getByPlaceholder('0.00').fill('500');

        // Fill Description
        await page.getByPlaceholder('e.g. Rebar purchase').fill('Test Expense');

        // Select Type: Expense (default is often expense, but let's be explicit if needed)
        // The Select for Type has placeholder "Type". 
        // We can assume default or select it. Let's try to select 'Expense'.
        // Note: Shadcn Select triggers are buttons.
        // await page.click('button:has-text("Type")'); // This might be ambiguous with label
        // await page.click('div[role="item"]:has-text("Expense")');

        // Select Project (Combobox)
        await page.getByRole('button', { name: 'Select a project' }).click();
        await page.waitForTimeout(500); // Wait for popover animation
        await page.locator('text=Alpha Project').click();

        // Select Ledger (Combobox)
        await page.getByRole('button', { name: 'Select a ledger' }).click();
        await page.waitForTimeout(500); // Wait for popover animation
        await page.locator('text=General Expenses').click();

        // Submit form
        await page.getByRole('button', { name: 'Add Transaction' }).click();

        // Verify success by checking if the new transaction appears in the table
        // It might take a moment, so use expect with visibility
        await expect(page.locator('text=Test Expense').first()).toBeVisible();
        await expect(page.locator('text=500').first()).toBeVisible();
    });
});
