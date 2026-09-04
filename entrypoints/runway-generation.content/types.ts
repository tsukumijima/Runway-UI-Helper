export interface RunwayTask {
    id: string;
    status: string;
    createdAt: string;
    updatedAt: string;
}

export interface RunwayGeneration {
    deleted: boolean;
    task: RunwayTask;
}

export interface RunwaySessionResponse {
    generations: RunwayGeneration[];
}
