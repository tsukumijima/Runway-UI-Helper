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
        description: 'Runway の生成時間を表示し、生成完了を通知します',
        version: '0.2.0',
        permissions: [
            'notifications',
            'storage',
        ],
    },
});
