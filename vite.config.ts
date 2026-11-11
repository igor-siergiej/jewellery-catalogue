import oxfmt from '@imapps/oxc-config/oxfmt';
import oxlint from '@imapps/oxc-config/oxlint';
import { defineConfig } from 'vite-plus';

// Workspace-root Vite+ config: lint (Oxlint), format (Oxfmt) and staged-file checks for every package.
// The shared IM Apps presets come from @imapps/oxc-config; per-package Vite/Vitest config lives in packages/web.
const ignorePatterns = [
    '**/.github/workflows-utils/**',
    '**/build/**',
    '**/dist/**',
    '**/coverage/**',
    '**/tests/e2e/mocks/data/**',
];

// Adopted toolchain-first: preset errors report as warnings until the existing code is brought in line.
const asWarning = (severity: unknown) => (severity === 'error' ? 'warn' : severity);

const presetRulesAsWarnings = Object.fromEntries(
    Object.entries(oxlint.rules ?? {}).map(([rule, value]) => [
        rule,
        Array.isArray(value) ? [asWarning(value[0]), ...value.slice(1)] : asWarning(value),
    ])
);

export default defineConfig({
    lint: {
        ...oxlint,
        categories: { correctness: 'warn' },
        ignorePatterns: [...(oxlint.ignorePatterns ?? []), ...ignorePatterns],
        jsPlugins: [...(oxlint.jsPlugins ?? []), { name: 'vite-plus', specifier: 'vite-plus/oxlint-plugin' }],
        rules: {
            ...presetRulesAsWarnings,
            'vite-plus/prefer-vite-plus-imports': 'error',
        },
        // typeCheck reports ~250 existing type errors; enable once they are fixed.
        options: { typeAware: true, typeCheck: false },
    },
    fmt: {
        ...oxfmt,
        // Code and JSON only: docs, YAML and the generated CHANGELOG.md stay as written.
        ignorePatterns: [
            ...(oxfmt.ignorePatterns ?? []),
            ...ignorePatterns,
            '**/*.md',
            '**/*.{yml,yaml}',
            '**/*.html',
            'bun.lock',
        ],
    },
    staged: {
        '*.{ts,tsx,mts,cts,js,jsx,mjs,cjs,json}': 'vp check --fix --no-error-on-unmatched-pattern',
    },
});
