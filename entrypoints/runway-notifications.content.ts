import type { GenerationCompletedMessage } from './runway-generation.content/types';

/**
 * ページ本体から届いた生成完了情報だけを拡張機能のバックグラウンド処理へ中継する。
 * @param value ページから受け取ったメッセージ候補
 * @returns 生成完了メッセージなら true
 */
const isGenerationCompletedMessage = (value: unknown): value is GenerationCompletedMessage => {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const message = value as Partial<GenerationCompletedMessage>;
    return message.source === 'runway-ui-helper'
        && message.type === 'generation-completed'
        && typeof message.taskID === 'string'
        && typeof message.modelName === 'string'
        && typeof message.elapsedMilliseconds === 'number'
        && typeof message.sessionURL === 'string'
        && message.sessionURL.startsWith('https://app.runwayml.com/video-tools/');
};

export default defineContentScript({
    matches: ['https://app.runwayml.com/video-tools/*'],
    main() {
        window.addEventListener('message', (event: MessageEvent<unknown>) => {
            // 同じ Runway 画面の MAIN world から送られた完了情報だけを受け入れる
            if (event.source !== window || event.origin !== window.location.origin || isGenerationCompletedMessage(event.data) === false) {
                return;
            }

            void browser.runtime.sendMessage(event.data);
        });
    },
});
