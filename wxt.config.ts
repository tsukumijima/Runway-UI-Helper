import { defineConfig } from 'wxt';

export default defineConfig({
    modules: ['@wxt-dev/module-vue'],
    imports: {
        eslintrc: {
            enabled: true,
        },
    },
    manifest: {
        name: 'Runway UI Helper',
        description: 'Runway の生成画面へ生成時間と生成中の経過時間を表示します',
        version: '0.1.0',
    },
});
