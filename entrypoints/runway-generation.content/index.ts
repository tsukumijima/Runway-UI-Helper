import { createApp, type App as VueApp } from 'vue';

import GenerationTimer from './GenerationTimer.vue';
import './style.css';

import type { GenerationCompletedMessage, RunwaySessionResponse, RunwayTask } from './types';

const SESSION_API_PATTERN = /^https:\/\/api\.runwayml\.com\/v1\/sessions\/[^/?]+(?:\?|$)/;
const TASK_API_PATTERN = /^https:\/\/api\.runwayml\.com\/v1\/tasks\/[^/?]+(?:\?|$)/;
const ITEM_SELECTOR = '[data-testid="virtuoso-item-list"] > [data-item-index]';
const TIMER_ROOT_CLASS = 'runway-ui-helper-timer-root';

interface MountedTimer {
    app: VueApp;
    fingerprint: string;
    root: HTMLElement;
}

export default defineContentScript({
    matches: ['https://app.runwayml.com/video-tools/*'],
    runAt: 'document_start',
    world: 'MAIN',
    main() {
        let tasks: Array<RunwayTask | null> = [];
        let hasReceivedSession = false;
        let isRenderScheduled = false;
        const mountedTimers = new Map<HTMLElement, MountedTimer>();
        const taskStatuses = new Map<string, string>();

        /**
         * Runway のタスク API から時刻表示に必要な公開フィールドだけを読み取る。
         * @param value API レスポンス内のタスク候補
         * @returns 表示に使えるタスク (必須フィールドが不足する場合は null)
         */
        const parseTask = (value: unknown): RunwayTask | null => {
            if (typeof value !== 'object' || value === null) {
                return null;
            }

            const taskCandidate = value as Partial<RunwayTask>;
            const hasRequiredFields = typeof taskCandidate.id === 'string'
                && typeof taskCandidate.status === 'string'
                && typeof taskCandidate.createdAt === 'string'
                && typeof taskCandidate.updatedAt === 'string';

            if (hasRequiredFields === false) {
                return null;
            }

            return {
                id: taskCandidate.id!,
                name: typeof taskCandidate.name === 'string' ? taskCandidate.name : undefined,
                status: taskCandidate.status!,
                taskType: typeof taskCandidate.taskType === 'string' ? taskCandidate.taskType : undefined,
                createdAt: taskCandidate.createdAt!,
                updatedAt: taskCandidate.updatedAt!,
            };
        };

        /**
         * Runway の表示用タスク名からモデル名だけを取り出す。
         * @param task モデル名を含むタスク
         * @returns 通知へ表示するモデル名
         */
        const getModelName = (task: RunwayTask): string => {
            const namePrefix = task.name?.split(' - ', 1)[0].trim();
            const rawModelName = namePrefix || task.taskType || 'Runway';

            // 内部名の数字間にあるアンダースコアを小数点へ戻して、画面上のモデル名に近づける
            return rawModelName.replace(/(?<=\d)_(?=\d)/g, '.');
        };

        /**
         * 観測済みタスクが成功状態へ移った場合だけ、拡張機能側へ完了情報を渡す。
         * @param task 最新状態のタスク
         */
        const observeTaskStatus = (task: RunwayTask): void => {
            const previousStatus = taskStatuses.get(task.id);
            taskStatuses.set(task.id, task.status);

            // 初回取得した完了済みタスクを除き、この画面で追跡していた生成の完了だけを通知する
            if (previousStatus === undefined || previousStatus === 'SUCCEEDED' || task.status !== 'SUCCEEDED') {
                return;
            }

            const message: GenerationCompletedMessage = {
                source: 'runway-ui-helper',
                type: 'generation-completed',
                taskID: task.id,
                modelName: getModelName(task),
                elapsedMilliseconds: Math.max(0, Date.parse(task.updatedAt) - Date.parse(task.createdAt)),
                sessionURL: window.location.href,
            };
            window.postMessage(message, window.location.origin);
        };

        /**
         * 仮想スクロールで現在 DOM に存在する生成カードへ Vue の時刻表示を取り付ける。
         * API は新しい順、画面の項目番号は古い順なので、配列の末尾から項目番号へ対応付ける。
         */
        const renderTimers = (): void => {
            isRenderScheduled = false;
            const visibleItems = new Set(document.querySelectorAll<HTMLElement>(ITEM_SELECTOR));

            // 画面外へ再利用された仮想スクロール要素の Vue インスタンスを片付ける
            for (const [item, mountedTimer] of mountedTimers) {
                if (visibleItems.has(item) === false || item.isConnected === false) {
                    mountedTimer.app.unmount();
                    mountedTimer.root.remove();
                    mountedTimers.delete(item);
                }
            }

            for (const item of visibleItems) {
                const itemIndex = Number(item.dataset.itemIndex);
                const task = tasks[tasks.length - 1 - itemIndex];
                const card = item.querySelector<HTMLElement>('[data-output-mode]');

                if (Number.isInteger(itemIndex) === false || task === undefined || task === null || card === null) {
                    continue;
                }

                const fingerprint = `${task.id}:${task.status}:${task.updatedAt}`;
                const mountedTimer = mountedTimers.get(item);

                // API の進捗更新または仮想スクロールの要素再利用時だけ内容を差し替える
                if (mountedTimer?.fingerprint === fingerprint && mountedTimer.root.isConnected === true) {
                    continue;
                }
                if (mountedTimer !== undefined) {
                    mountedTimer.app.unmount();
                    mountedTimer.root.remove();
                }

                const root = document.createElement('div');
                root.className = TIMER_ROOT_CLASS;
                root.style.display = 'flex';
                card.prepend(root);

                const app = createApp(GenerationTimer, { task });
                app.mount(root);
                mountedTimers.set(item, { app, fingerprint, root });
            }
        };

        // 短時間に連続する API 更新と DOM 変更を1フレームにまとめて画面の再計算回数を抑える
        const scheduleRender = (): void => {
            if (isRenderScheduled === true) {
                return;
            }
            isRenderScheduled = true;
            window.requestAnimationFrame(renderTimers);
        };

        /**
         * Runway の API レスポンスを読み、セッション全体または個別タスクの最新時刻を反映する。
         * @param url レスポンスの URL
         * @param response 本体を複製して読めるレスポンス
         */
        const consumeResponse = async (url: string, response: Response): Promise<void> => {
            if (SESSION_API_PATTERN.test(url) === false && TASK_API_PATTERN.test(url) === false) {
                return;
            }

            try {
                const payload: unknown = await response.json();

                if (SESSION_API_PATTERN.test(url) === true) {
                    const sessionResponse = payload as Partial<RunwaySessionResponse>;
                    if (Array.isArray(sessionResponse.generations) === true) {
                        // 画面に出ない削除済み項目を除外してから、画面の項目番号と API の配列を対応付ける
                        tasks = sessionResponse.generations
                            .filter((generation) => generation.deleted !== true)
                            .map((generation) => parseTask(generation?.task));
                        for (const task of tasks) {
                            if (task !== null) {
                                if (hasReceivedSession === true) {
                                    observeTaskStatus(task);
                                } else {
                                    taskStatuses.set(task.id, task.status);
                                }
                            }
                        }
                        hasReceivedSession = true;
                        scheduleRender();
                    }
                    return;
                }

                const payloadRecord = payload as { task?: unknown };
                const updatedTask = parseTask(payloadRecord.task ?? payload);
                if (updatedTask === null) {
                    return;
                }

                // 個別タスクのポーリング結果でステータスと完了時刻を更新する
                observeTaskStatus(updatedTask);
                tasks = tasks.map((task) => task?.id === updatedTask.id ? updatedTask : task);
                scheduleRender();
            } catch (error) {
                console.debug('Runway UI Helper could not parse an API response.', error);
            }
        };

        // Runway 本体へ返すレスポンスには触れず、clone() から表示用時刻だけを非同期で読む
        const originalFetch = window.fetch;
        window.fetch = async (...argumentsList): Promise<Response> => {
            const response = await originalFetch(...argumentsList);
            const requestURL = typeof argumentsList[0] === 'string'
                ? argumentsList[0]
                : argumentsList[0] instanceof URL
                    ? argumentsList[0].href
                    : argumentsList[0].url;
            void consumeResponse(requestURL, response.clone());
            return response;
        };

        // Runway の仮想スクロールがカード要素を入れ替えるたびに表示先を追従する
        const observer = new MutationObserver(scheduleRender);
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
        });
    },
});
