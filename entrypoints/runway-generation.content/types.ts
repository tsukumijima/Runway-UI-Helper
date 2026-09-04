export interface RunwayTask {
    id: string;
    name?: string;
    status: string;
    taskType?: string;
    createdAt: string;
    updatedAt: string;
}

export interface GenerationCompletedMessage {
    source: 'runway-ui-helper';
    type: 'generation-completed';
    taskID: string;
    modelName: string;
    elapsedMilliseconds: number;
    sessionURL: string;
}

export interface RunwayGeneration {
    deleted: boolean;
    task: RunwayTask;
}

export interface RunwaySessionResponse {
    generations: RunwayGeneration[];
}
