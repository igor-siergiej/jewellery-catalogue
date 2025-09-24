import { monorepoConfig } from '@igor-siergiej/eslint-config';
import muiPathImports from 'eslint-plugin-mui-path-imports';
import useEncapsulation from 'eslint-plugin-use-encapsulation';

export default [
    ...monorepoConfig,
    {
        files: ['packages/web/**/*.{ts,tsx}'],
        plugins: {
            'mui-path-imports': muiPathImports,
            'use-encapsulation': useEncapsulation,
        },
        rules: {
            'mui-path-imports/mui-path-imports': 'error',
            'use-encapsulation/prefer-custom-hooks': 'error',
        },
    },
];
