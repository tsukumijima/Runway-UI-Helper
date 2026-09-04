<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';

import type { RunwayTask } from './types';

const props = defineProps<{
    task: RunwayTask;
}>();

const TERMINAL_STATUSES = new Set([
    'CANCELED',
    'CANCELLED',
    'FAILED',
    'SUCCEEDED',
]);

const currentTimestamp = ref(Date.now());
const isTerminal = computed(() => TERMINAL_STATUSES.has(props.task.status));

// 実行中の表示だけを更新し、完了したタスクでは API が記録した時刻差を固定表示する
const timerID = window.setInterval(() => {
    if (isTerminal.value === false) {
        currentTimestamp.value = Date.now();
    }
}, 1000);

onBeforeUnmount(() => {
    window.clearInterval(timerID);
});

const elapsedMilliseconds = computed(() => {
    const createdTimestamp = Date.parse(props.task.createdAt);
    const endTimestamp = isTerminal.value === true
        ? Date.parse(props.task.updatedAt)
        : currentTimestamp.value;

    return Math.max(0, endTimestamp - createdTimestamp);
});

const elapsedText = computed(() => {
    const totalSeconds = Math.floor(elapsedMilliseconds.value / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const parts: string[] = [];

    // 生成が長時間に及んだ場合だけ時間を加え、通常の表示幅は短く保つ
    if (hours > 0) {
        parts.push(`${hours}時間`);
    }
    if (minutes > 0 || hours > 0) {
        parts.push(`${minutes}分`);
    }
    parts.push(`${seconds}秒`);

    return parts.join('');
});

const tooltipText = computed(() => {
    const dateTimeFormatter = new Intl.DateTimeFormat('ja-JP', {
        dateStyle: 'medium',
        timeStyle: 'medium',
    });
    const createdAt = dateTimeFormatter.format(new Date(props.task.createdAt));
    const updatedAt = dateTimeFormatter.format(new Date(props.task.updatedAt));

    if (isTerminal.value === true) {
        return `開始: ${createdAt}\n終了: ${updatedAt}\n状態: ${props.task.status}`;
    }
    return `開始: ${createdAt}\n状態: ${props.task.status}`;
});
</script>

<template>
    <div class="runway-ui-helper-timer" :class="{ running: !isTerminal }" :title="tooltipText">
        <span class="label">{{ isTerminal ? '生成時間' : '経過時間' }}</span>
        <span class="value">{{ elapsedText }}</span>
    </div>
</template>
