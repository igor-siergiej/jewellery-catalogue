import { Page } from '@playwright/test';

/**
 * Clears all authentication state including cookies, localStorage, and sessionStorage
 */
export const clearAuthState = async (page: Page) => {
    await page.context().clearCookies();

    // Clear localStorage and sessionStorage with error handling
    try {
        await page.evaluate(() => {
            try {
                localStorage.clear();
            } catch (e) {
                // localStorage might be disabled or not accessible
                console.warn('Could not clear localStorage:', e);
            }
            try {
                sessionStorage.clear();
            } catch (e) {
                // sessionStorage might be disabled or not accessible
                console.warn('Could not clear sessionStorage:', e);
            }
        });
    } catch (e) {
        // Page evaluation might fail in some environments
        console.warn('Could not evaluate storage clearing:', e);
    }
};

/**
 * Generates a unique username for testing to avoid conflicts
 */
export const generateUniqueUsername = () =>
    `testuser_${Date.now()}_${Math.random().toString(36).substring(7)}`;

/**
 * Waits for authentication services to be ready before running tests
 */
export const waitForAuthServices = async (page: Page) => {
    let retries = 0;
    const maxRetries = 10;

    while (retries < maxRetries) {
        try {
            const response = await page.request.get('http://192.168.68.54:5002/health');
            if (response.status() === 200) break;
        } catch (error) {
            // Service not ready yet
        }
        retries++;
        await page.waitForTimeout(1000);
    }
};

/**
 * Performs a complete user registration flow
 */
export const registerUser = async (page: Page, username: string, password: string) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    // Wait for form to render
    await page.waitForSelector('input[name="username"]', { timeout: 10000 });

    await page.fill('input[name="username"]', username);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');

    // Wait for navigation to home page (using regex pattern)
    await page.waitForURL(/\/home$/, { timeout: 15000 });
};

/**
 * Performs a complete user login flow
 */
export const loginUser = async (page: Page, username: string, password: string) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for form to render
    await page.waitForSelector('input[name="username"]', { timeout: 10000 });

    await page.fill('input[name="username"]', username);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');

    // Wait for navigation to home page (using regex pattern)
    await page.waitForURL(/\/home$/, { timeout: 15000 });
};

/**
 * Test credentials that meet validation requirements
 */
export const testCredentials = {
    validPassword: 'validPassword123',
    weakPasswords: {
        tooShort: 'weak',
        noNumber: 'weakpassword',
        noLetter: '12345678'
    }
};

/**
 * Common page elements selectors for authentication forms
 */
export const selectors = {
    usernameInput: 'input[name="username"]',
    passwordInput: 'input[name="password"]',
    submitButton: 'button[type="submit"]',
    showPasswordButton: 'button[aria-label="Show password"]',
    hidePasswordButton: 'button[aria-label="Hide password"]',
    registerButton: 'button:has-text("Register!")',
    loginButton: 'button:has-text("Login!")',
    errorAlert: '[role="alert"]',
    usernameRequiredError: 'text=Username is required',
    passwordRequiredError: 'text=Password is required',
    passwordValidationError: 'text=Password must be at least 8 characters long and contain at least one letter and one number',
    registrationError: 'text=Registration Error',
    loginError: 'text=Login Error'
};

/**
 * Expected page content for authentication pages
 */
export const pageContent = {
    login: {
        title: 'Jewellery Catalogue',
        subtitle: 'Welcome back Goldsmith!',
        submitButtonText: 'Login'
    },
    register: {
        title: 'Jewellery Catalogue',
        subtitle: 'Join the goldsmith empire!',
        submitButtonText: 'Register'
    }
};
