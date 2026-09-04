import type { GenerationCompletedMessage } from './runway-generation.content/types';

interface NotificationTarget {
    sessionURL: string;
    tabID?: number;
    windowID?: number;
}

const NOTIFICATION_PREFIX = 'runway-generation-completed:';

/**
 * ミリ秒単位の生成時間を通知向けの短い日本語へ整える。
 * @param elapsedMilliseconds 生成開始から完了までのミリ秒
 * @returns 時・分・秒で表した生成時間
 */
const formatElapsedTime = (elapsedMilliseconds: number): string => {
    const totalSeconds = Math.floor(elapsedMilliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const parts: string[] = [];

    if (hours > 0) {
        parts.push(`${hours}時間`);
    }
    if (minutes > 0 || hours > 0) {
        parts.push(`${minutes}分`);
    }
    parts.push(`${seconds}秒`);
    return parts.join('');
};

/**
 * 拡張機能内へ届いたメッセージが生成完了通知の形式を満たすか確認する。
 * @param value メッセージ候補
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
        && Number.isFinite(message.elapsedMilliseconds)
        && typeof message.sessionURL === 'string'
        && message.sessionURL.startsWith('https://app.runwayml.com/video-tools/');
};

export default defineBackground(() => {
    browser.runtime.onMessage.addListener((message: unknown, sender) => {
        if (isGenerationCompletedMessage(message) === false) {
            return;
        }

        const notificationID = `${NOTIFICATION_PREFIX}${message.taskID}`;
        const target: NotificationTarget = {
            sessionURL: message.sessionURL,
            tabID: sender.tab?.id,
            windowID: sender.tab?.windowId,
        };

        // Service Worker が休止しても通知クリックから元の画面へ戻れるよう、遷移先をセッション中だけ保持する
        void browser.storage.session.set({ [notificationID]: target });
        void browser.notifications.create(notificationID, {
            type: 'basic',
            iconUrl: browser.runtime.getURL('/icon.svg'),
            title: `${message.modelName} の生成が完了しました！（${formatElapsedTime(message.elapsedMilliseconds)}）`,
            message: 'クリックして Runway の生成画面を開く',
            requireInteraction: true,
        });
    });

    browser.notifications.onClicked.addListener((notificationID) => {
        if (notificationID.startsWith(NOTIFICATION_PREFIX) === false) {
            return;
        }

        void (async () => {
            const storedTargets = await browser.storage.session.get(notificationID);
            const target = storedTargets[notificationID] as NotificationTarget | undefined;
            if (target === undefined) {
                return;
            }

            // 元のタブが残っていればそのウィンドウを前面へ出し、閉じていれば同じセッションを開き直す
            if (target.tabID !== undefined) {
                try {
                    await browser.tabs.update(target.tabID, { active: true });
                    if (target.windowID !== undefined) {
                        await browser.windows.update(target.windowID, { focused: true });
                    }
                    await browser.notifications.clear(notificationID);
                    return;
                } catch (error) {
                    console.debug('Runway UI Helper could not focus the original tab.', error);
                }
            }

            await browser.tabs.create({ url: target.sessionURL });
            await browser.notifications.clear(notificationID);
        })();
    });
});
