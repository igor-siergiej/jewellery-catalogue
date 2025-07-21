import { test, expect } from '@playwright/test';

test.describe('User Registration Flow', () => {
    const testUser = {
        username: 'testuser' + Date.now(), // Make username unique
        password: 'TestPassword123',
        validPassword: 'ValidPass123',
        invalidPassword: 'short'
    };

    test.beforeEach(async ({ page }) => {
        await page.goto('/register');
    });

    test('should display the registration page with correct elements', async ({ page }) => {
    // Check page title
        await expect(page).toHaveTitle('Jewellery Catalogue');

        // Check main heading and subtitle
        await expect(page.getByText('Jewellery Catalogue')).toBeVisible();
        await expect(page.getByText('Join the goldsmith empire!')).toBeVisible();

        // Check form elements are present
        await expect(page.getByLabel('Username')).toBeVisible();
        await expect(page.locator('input[type="password"]')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Register' })).toBeVisible();

        // Check login link
        await expect(page.getByText('Already part of the goldsmith empire?')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Login!' })).toBeVisible();
    });

    test('should validate required fields', async ({ page }) => {
    // Try to submit empty form
        await page.getByRole('button', { name: 'Register' }).click();

        // Check validation messages
        await expect(page.getByText('Username is required')).toBeVisible();
        await expect(page.getByText('Password is required')).toBeVisible();
    });

    test('should validate password requirements', async ({ page }) => {
    // Fill username
        await page.getByLabel('Username').fill(testUser.username);

        // Try with invalid password (too short)
        await page.locator('#password').fill(testUser.invalidPassword);
        await page.getByRole('button', { name: 'Register' }).click();

        // Check password validation message
        await expect(page.getByText('Password must be at least 8 characters long and contain at least one letter and one number')).toBeVisible();
    });

    test('should toggle password visibility', async ({ page }) => {
        const passwordField = page.locator('#password');
        const toggleButton = page.getByRole('button', { name: 'Show password' });

        // Initially password should be hidden
        await expect(passwordField).toHaveAttribute('type', 'password');

        // Fill password and check it's masked
        await passwordField.fill(testUser.validPassword);

        // Click toggle to show password
        await toggleButton.click();
        await expect(passwordField).toHaveAttribute('type', 'text');
        await expect(page.getByRole('button', { name: 'Hide password' })).toBeVisible();

        // Click toggle to hide password again
        await page.getByRole('button', { name: 'Hide password' }).click();
        await expect(passwordField).toHaveAttribute('type', 'password');
    });

    test('should navigate back to login page', async ({ page }) => {
        await page.getByRole('button', { name: 'Login!' }).click();

        // Should navigate to the start page (login page)
        await expect(page).toHaveURL('/');
        await expect(page.getByText('Welcome back Goldsmith!')).toBeVisible();
    });

    test('should show loading state during registration', async ({ page }) => {
    // Fill form with valid data
        await page.getByLabel('Username').fill(testUser.username);
        await page.locator('#password').fill(testUser.validPassword);

        // Mock API response to delay it
        await page.route('**/register', async (route) => {
            await new Promise(resolve => setTimeout(resolve, 1000));
            await route.continue();
        });

        // Click register button
        await page.getByRole('button', { name: 'Register' }).click();

        // Check loading state
        await expect(page.getByRole('button', { name: 'Register' })).toBeDisabled();

        // Check for loading indicator (MUI LoadingButton shows a circular progress)
        await expect(page.locator('.MuiCircularProgress-root, [data-testid="loading"]')).toBeVisible();
    });

    test('should handle registration error', async ({ page }) => {
    // Fill form with valid data
        await page.getByLabel('Username').fill('existing_user');
        await page.locator('#password').fill(testUser.validPassword);

        // Mock API error response
        await page.route('**/register', async (route) => {
            await route.fulfill({
                status: 400,
                contentType: 'application/json',
                body: JSON.stringify({ message: 'Username already exists' })
            });
        });

        // Submit form
        await page.getByRole('button', { name: 'Register' }).click();

        // Check error alert appears
        await expect(page.getByText('Registration Error')).toBeVisible();
        await expect(page.getByText('Username already exists')).toBeVisible();

        // Form should be re-enabled
        await expect(page.getByRole('button', { name: 'Register' })).not.toBeDisabled();
    });

    test('should successfully register and redirect to home', async ({ page }) => {
    // Fill form with valid data
        await page.getByLabel('Username').fill(testUser.username);
        await page.locator('#password').fill(testUser.validPassword);

        // Mock successful API responses
        await page.route('**/register', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMzQ1NiIsInVzZXJuYW1lIjoidGVzdHVzZXIiLCJpYXQiOjE2MzQ1Njc4OTB9.test_token'
                })
            });
        });

        await page.route('**/catalogue', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ success: true })
            });
        });

        // Submit form
        await page.getByRole('button', { name: 'Register' }).click();

        // Should redirect to home page
        await expect(page).toHaveURL('/home');

        // Wait for page to load completely
        await page.waitForLoadState('networkidle');
    });

    test('should have proper form accessibility', async ({ page }) => {
    // Check form has proper labels
        await expect(page.getByLabel('Username')).toBeVisible();
        await expect(page.locator('#password')).toBeVisible();

        // Check password toggle button has proper aria-label
        await expect(page.getByRole('button', { name: 'Show password' })).toBeVisible();

        // Check form can be navigated with keyboard
        await page.keyboard.press('Tab');
        await expect(page.getByLabel('Username')).toBeFocused();

        await page.keyboard.press('Tab');
        await expect(page.locator('#password')).toBeFocused();

        await page.keyboard.press('Tab');
        await expect(page.getByRole('button', { name: 'Show password' })).toBeFocused();

        await page.keyboard.press('Tab');
        await expect(page.getByRole('button', { name: 'Register' })).toBeFocused();
    });

    test('should handle API server error', async ({ page }) => {
    // Fill form with valid data
        await page.getByLabel('Username').fill(testUser.username);
        await page.locator('#password').fill(testUser.validPassword);

        // Mock server error (500)
        await page.route('**/register', async (route) => {
            await route.fulfill({
                status: 500,
                contentType: 'application/json',
                body: JSON.stringify({ message: 'Internal server error' })
            });
        });

        // Submit form
        await page.getByRole('button', { name: 'Register' }).click();

        // Check error alert appears
        await expect(page.getByText('Registration Error')).toBeVisible();
        await expect(page.getByText('Internal server error')).toBeVisible();
    });
});
