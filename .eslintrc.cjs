const path = require('path');

/** @type {import('eslint').Linter.Config} */
module.exports = {
    root: true,
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
    },
    env: {
        browser: true,
        commonjs: true,
        es6: true,
    },
    ignorePatterns: ['.output/**', '.wxt/**'],
    plugins: [
        '@typescript-eslint',
        'import',
        'unused-imports',
        'vue',
    ],
    extends: [
        'eslint:recommended',
        'plugin:vue/vue3-recommended',
    ],
    overrides: [
        {
            files: ['**/*.{ts,vue}'],
            plugins: ['@typescript-eslint', 'import'],
            parser: 'vue-eslint-parser',
            parserOptions: {
                parser: '@typescript-eslint/parser',
                extraFileExtensions: ['.vue'],
                project: path.resolve(__dirname, './tsconfig.json'),
            },
            settings: {
                'import/resolver': {
                    typescript: {},
                },
            },
            extends: [
                'plugin:@typescript-eslint/recommended',
                'plugin:import/recommended',
                'plugin:import/typescript',
                '@vue/eslint-config-typescript',
            ],
        },
        {
            files: ['.eslintrc.cjs'],
            env: {
                node: true,
            },
        },
    ],
    rules: {
        '@typescript-eslint/comma-dangle': ['error', {
            objects: 'always-multiline',
            arrays: 'always-multiline',
            imports: 'always-multiline',
            exports: 'always-multiline',
            functions: 'only-multiline',
        }],
        '@typescript-eslint/indent': ['error', 4, { SwitchCase: 1 }],
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/quotes': ['error', 'single'],
        '@typescript-eslint/semi': ['error', 'always'],
        '@typescript-eslint/triple-slash-reference': 'off',
        'import/order': ['warn', {
            alphabetize: { order: 'asc', caseInsensitive: true },
            groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'object', 'type'],
            'newlines-between': 'always',
            pathGroupsExcludedImportTypes: ['builtin'],
        }],
        'no-constant-condition': ['error', { checkLoops: false }],
        'no-irregular-whitespace': 'off',
        'no-trailing-spaces': 'error',
        'no-unused-vars': 'off',
        'unused-imports/no-unused-imports': 'warn',
        'vue/html-indent': ['error', 4],
        'vue/max-attributes-per-line': ['error', { singleline: 4, multiline: 1 }],
    },
};
