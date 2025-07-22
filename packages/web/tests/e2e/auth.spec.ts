import { expect, test } from '@playwright/test';

import {
    clearAuthState,
    generateUniqueUsername,
    loginUser,
    pageContent,
    registerUser,
    selectors,
    testCredentials,
    waitForAuthServices } from './utils/auth-helpers';

test.describe('Authentication Flow', () => {
    test.beforeEach(async ({ page }) => {
        await clearAuthState(page);
        await waitForAuthServices(page);
    });

    test.afterEach(async ({ page }) => {
        await clearAuthState(page);
    });

    test.describe('Register Page', () => {
        test('should display register form with required elements', async ({ page }) => {
            await page.goto('/register');
            await page.waitForLoadState('networkidle');

            // Check page elements
            await expect(page.locator('h1')).toContainText(pageContent.register.title);
            await expect(page.locator('h2')).toContainText(pageContent.register.subtitle);

            // Check form fields
            await expect(page.locator(selectors.usernameInput)).toBeVisible();
            await expect(page.locator(selectors.passwordInput)).toBeVisible();
            await expect(page.locator(selectors.submitButton)).toContainText(pageContent.register.submitButtonText);

            // Check navigation link
            await expect(page.locator(selectors.loginButton)).toBeVisible();
        });

        test('should validate required fields on register form', async ({ page }) => {
            await page.goto('/register');
            await page.waitForLoadState('networkidle');

            // Try to submit empty form
            await page.click(selectors.submitButton);

            // Check for validation messages
            await expect(page.locator(selectors.usernameRequiredError)).toBeVisible();
            await expect(page.locator(selectors.passwordRequiredError)).toBeVisible();
        });

        test('should validate password requirements', async ({ page }) => {
            await page.goto('/register');
            await page.waitForLoadState('networkidle');

            const usernameInput = page.locator(selectors.usernameInput);
            const passwordInput = page.locator(selectors.passwordInput);

            await usernameInput.fill('testuser');

            // Test each weak password scenario
            const weakPasswords = [
                testCredentials.weakPasswords.tooShort,
                testCredentials.weakPasswords.noNumber,
                testCredentials.weakPasswords.noLetter
            ];

            for (const weakPassword of weakPasswords) {
                await passwordInput.fill(weakPassword);
                await page.click(selectors.submitButton);
                await expect(page.locator(selectors.passwordValidationError)).toBeVisible();
            }
        });

        test('should successfully register a new user and navigate to home', async ({ page }) => {
            const username = generateUniqueUsername();
            const password = testCredentials.validPassword;

            await registerUser(page, username, password);

            // Verify successful navigation
            expect(page.url()).toContain('/home');

            // Verify no error alerts
            await expect(page.locator(selectors.errorAlert)).not.toBeVisible();
        });

        test('should show error for duplicate username', async ({ page }) => {
            const username = generateUniqueUsername();
            const password = testCredentials.validPassword;

            // First registration
            await registerUser(page, username, password);

            // Clear auth state and try to register with same username
            await clearAuthState(page);
            await page.goto('/register');
            await page.waitForLoadState('networkidle');

            await page.fill(selectors.usernameInput, username);
            await page.fill(selectors.passwordInput, password);
            await page.click(selectors.submitButton);

            // Should show error alert
            await expect(page.locator(selectors.errorAlert)).toBeVisible();
            await expect(page.locator(selectors.registrationError)).toBeVisible();
        });

        test('should navigate to login page when Login button is clicked', async ({ page }) => {
            await page.goto('/register');
            await page.waitForLoadState('networkidle');

            await page.click(selectors.loginButton);

            await page.waitForURL('/', { timeout: 5000 });
            expect(page.url()).toBe('http://localhost:8082/');
        });

        test('should toggle password visibility', async ({ page }) => {
            await page.goto('/register');
            await page.waitForLoadState('networkidle');

            const passwordInput = page.locator(selectors.passwordInput);
            const toggleButton = page.locator(selectors.showPasswordButton);

            // Initially password should be hidden
            await expect(passwordInput).toHaveAttribute('type', 'password');

            // Click toggle to show password
            await toggleButton.click();
            await expect(passwordInput).toHaveAttribute('type', 'text');
            await expect(page.locator(selectors.hidePasswordButton)).toBeVisible();

            // Click toggle to hide password again
            await page.locator(selectors.hidePasswordButton).click();
            await expect(passwordInput).toHaveAttribute('type', 'password');
        });
    });

    test.describe('Login Page', () => {
        test('should display login form with required elements', async ({ page }) => {
            await page.goto('/');
            await page.waitForLoadState('networkidle');

            // Check page elements
            await expect(page.locator('h1')).toContainText(pageContent.login.title);
            await expect(page.locator('h2')).toContainText(pageContent.login.subtitle);

            // Check form fields
            await expect(page.locator(selectors.usernameInput)).toBeVisible();
            await expect(page.locator(selectors.passwordInput)).toBeVisible();
            await expect(page.locator(selectors.submitButton)).toContainText(pageContent.login.submitButtonText);

            // Check navigation link
            await expect(page.locator(selectors.registerButton)).toBeVisible();
        });

        test('should validate required fields on login form', async ({ page }) => {
            await page.goto('/');
            await page.waitForLoadState('networkidle');

            // Try to submit empty form
            await page.click(selectors.submitButton);

            // Check for validation messages
            await expect(page.locator(selectors.usernameRequiredError)).toBeVisible();
            await expect(page.locator(selectors.passwordRequiredError)).toBeVisible();
        });

        test('should show error for invalid credentials', async ({ page }) => {
            await page.goto('/');
            await page.waitForLoadState('networkidle');

            await page.fill(selectors.usernameInput, 'nonexistentuser');
            await page.fill(selectors.passwordInput, 'wrongpassword');
            await page.click(selectors.submitButton);

            // Should show error alert
            await expect(page.locator(selectors.errorAlert)).toBeVisible();
            await expect(page.locator(selectors.loginError)).toBeVisible();
        });

        test('should navigate to register page when Register button is clicked', async ({ page }) => {
            await page.goto('/');
            await page.waitForLoadState('networkidle');

            await page.click(selectors.registerButton);

            await page.waitForURL('**/register', { timeout: 5000 });
            expect(page.url()).toContain('/register');
        });

        test('should toggle password visibility', async ({ page }) => {
            await page.goto('/');
            await page.waitForLoadState('networkidle');

            const passwordInput = page.locator(selectors.passwordInput);
            const toggleButton = page.locator(selectors.showPasswordButton);

            // Initially password should be hidden
            await expect(passwordInput).toHaveAttribute('type', 'password');

            // Click toggle to show password
            await toggleButton.click();
            await expect(passwordInput).toHaveAttribute('type', 'text');
            await expect(page.locator(selectors.hidePasswordButton)).toBeVisible();

            // Click toggle to hide password again
            await page.locator(selectors.hidePasswordButton).click();
            await expect(passwordInput).toHaveAttribute('type', 'password');
        });
    });

    test.describe('Complete Authentication Flow', () => {
        test('should complete full register -> logout -> login flow', async ({ page }) => {
            const username = generateUniqueUsername();
            const password = testCredentials.validPassword;

            // Step 1: Register
            await registerUser(page, username, password);
            expect(page.url()).toContain('/home');

            // Step 2: Logout (simulate by clearing auth state)
            await clearAuthState(page);

            // Step 3: Login with the same credentials
            await loginUser(page, username, password);
            expect(page.url()).toContain('/home');

            // Verify no error alerts
            await expect(page.locator(selectors.errorAlert)).not.toBeVisible();
        });

        test('should redirect authenticated users away from auth pages', async ({ page }) => {
            const username = generateUniqueUsername();
            const password = testCredentials.validPassword;

            // Register and login
            await registerUser(page, username, password);

            // Try to access login page while authenticated
            await page.goto('/');
            await page.waitForLoadState('networkidle');
            expect(page.url()).toContain('/home');

            // Try to access register page while authenticated
            await page.goto('/register');
            await page.waitForLoadState('networkidle');
            expect(page.url()).toContain('/home');
        });
    });

    test.describe('Error Handling and Network Issues', () => {
        test('should handle network errors gracefully during registration', async ({ page }) => {
            // Intercept and fail the registration request
            await page.route('**/register', route => route.abort());

            await page.goto('/register');
            await page.waitForLoadState('networkidle');

            const username = generateUniqueUsername();
            const password = testCredentials.validPassword;

            await page.fill(selectors.usernameInput, username);
            await page.fill(selectors.passwordInput, password);
            await page.click(selectors.submitButton);

            // Should show error alert
            await expect(page.locator(selectors.errorAlert)).toBeVisible();
            await expect(page.locator(selectors.registrationError)).toBeVisible();
        });

        test('should handle network errors gracefully during login', async ({ page }) => {
            // Intercept and fail the login request
            await page.route('**/login', route => route.abort());

            await page.goto('/');
            await page.waitForLoadState('networkidle');

            await page.fill(selectors.usernameInput, 'testuser');
            await page.fill(selectors.passwordInput, 'password123');
            await page.click(selectors.submitButton);

            // Should show error alert
            await expect(page.locator(selectors.errorAlert)).toBeVisible();
            await expect(page.locator(selectors.loginError)).toBeVisible();
        });
    });

    test.describe('Form Loading States', () => {
        test('should show loading state during registration', async ({ page }) => {
            await page.goto('/register');
            await page.waitForLoadState('networkidle');

            const username = generateUniqueUsername();
            const password = testCredentials.validPassword;

            await page.fill(selectors.usernameInput, username);
            await page.fill(selectors.passwordInput, password);

            // Slow down the network to see loading state
            await page.route('**/register', async (route) => {
                await page.waitForTimeout(1000);
                await route.continue();
            });

            await page.click(selectors.submitButton);

            // Check loading button state
            const submitButton = page.locator(selectors.submitButton);
            await expect(submitButton).toBeDisabled();
            await expect(submitButton).toHaveAttribute('aria-label', 'loading');
        });

        test('should show loading state during login', async ({ page }) => {
            await page.goto('/');
            await page.waitForLoadState('networkidle');

            await page.fill(selectors.usernameInput, 'testuser');
            await page.fill(selectors.passwordInput, 'password123');

            // Slow down the network to see loading state
            await page.route('**/login', async (route) => {
                await page.waitForTimeout(1000);
                await route.continue();
            });

            await page.click(selectors.submitButton);

            // Check loading button state
            const submitButton = page.locator(selectors.submitButton);
            await expect(submitButton).toBeDisabled();
            await expect(submitButton).toHaveAttribute('aria-label', 'loading');
        });
    });
});
