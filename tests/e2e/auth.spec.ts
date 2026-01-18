import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
    test('should login successfully with valid credentials', async ({ page }) => {
        // Navigate to login page
        await page.goto('/login');

        // Fill login form
        // Using placeholders is often more robust if labels are styled/transformed
        await page.getByPlaceholder('name@company.com').fill('admin@acme.com');
        await page.getByPlaceholder('••••••••').fill('Password123!');

        // Submit form
        await page.getByRole('button', { name: 'Sign In' }).click();

        // Verify redirection to dashboard
        await expect(page).toHaveURL('/dashboard');

        // Verify user name is displayed
        await expect(page.getByText('Admin User')).toBeVisible();
    });

    test('should show error with invalid credentials', async ({ page }) => {
        await page.goto('/login');

        await page.getByPlaceholder('name@company.com').fill('admin@acme.com');
        await page.getByPlaceholder('••••••••').fill('WrongPassword');

        await page.getByRole('button', { name: 'Sign In' }).click();

        // Verify error message
        // The error is shown in a div with border-destructive
        await expect(page.locator('text=Invalid email or password')).toBeVisible();
    });
});
