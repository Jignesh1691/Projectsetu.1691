import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
    test('should allow user to log in and see dashboard', async ({ page }: { page: any }) => {
        // Navigate to login page
        await page.goto('/login');

        // Fill in credentials
        await page.fill('input[type="email"]', 'admin@acme.com');
        await page.fill('input[type="password"]', 'Password123!');

        // Click sign in
        await page.click('button[type="submit"]');

        // Wait for navigation to dashboard
        await expect(page).toHaveURL(/.*dashboard|.*app|.*admin/);

        // Check if sidebar is visible
        await expect(page.locator('nav')).toBeVisible();
        await expect(page.getByText('ProjectSetu')).toBeVisible();
    });

    test('should show error on invalid credentials', async ({ page }: { page: any }) => {
        await page.goto('/login');
        await page.fill('input[type="email"]', 'wrong@example.com');
        await page.fill('input[type="password"]', 'wrongpass');
        await page.click('button[type="submit"]');

        // Verify error message
        await expect(page.getByText('Invalid email or password')).toBeVisible();
    });
});
