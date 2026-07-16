import type { ImportCandidate, ImportCommitRequest, ImportRun } from '@jewellery-catalogue/types';

import type { DesignImportService } from '../DesignImportService';
import type { IdGenerator } from '../IdGenerator';
import type { ImportRunRepository } from '../ImportRunRepository';

export class ImportRunService {
    // biome-ignore lint/correctness/noUnusedPrivateClassMembers: read externally by tests to await the in-flight loop deterministically
    private execution: Promise<void> | undefined;

    constructor(
        private readonly runRepo: ImportRunRepository,
        private readonly importService: DesignImportService,
        private readonly idGenerator: IdGenerator
    ) {}

    async start(request: ImportCommitRequest, userId: string): Promise<ImportRun> {
        const running = await this.runRepo.findRunning(userId);
        if (running) {
            throw Object.assign(new Error('An import is already running'), { status: 409 });
        }

        const run: ImportRun = {
            id: this.idGenerator.generate(),
            userId,
            status: 'running',
            fileName: request.fileName,
            total: request.candidates.length,
            processed: 0,
            created: 0,
            updated: 0,
            failed: [],
            startedAt: new Date(),
            cancelRequested: false,
        };
        await this.runRepo.insert(run);
        this.execution = this.execute(run, request.candidates);
        return run;
    }

    async getRuns(userId: string): Promise<ImportRun[]> {
        return this.runRepo.getByUserId(userId);
    }

    async getRun(id: string, userId: string): Promise<ImportRun> {
        const run = await this.runRepo.getByIdAndUserId(id, userId);
        if (!run) {
            throw Object.assign(new Error('Import run not found'), { status: 404 });
        }
        return run;
    }

    async cancel(id: string, userId: string): Promise<ImportRun> {
        const run = await this.getRun(id, userId);
        if (run.status !== 'running') return run;
        const updated = { ...run, cancelRequested: true };
        await this.runRepo.update(run.id, updated);
        return updated;
    }

    private async execute(run: ImportRun, candidates: ImportCandidate[]): Promise<void> {
        let current = run;
        const cleared = { currentListing: undefined, currentImageProgress: undefined };
        try {
            const ctx = await this.importService.createCommitContext(run.userId);
            for (const candidate of candidates) {
                const latest = await this.runRepo.getById(run.id);
                if (latest?.cancelRequested) {
                    current = {
                        ...current,
                        ...cleared,
                        cancelRequested: true,
                        status: 'cancelled',
                        finishedAt: new Date(),
                    };
                    await this.runRepo.update(run.id, current);
                    return;
                }

                current = { ...current, currentListing: candidate.row.title.trim(), currentImageProgress: undefined };
                await this.runRepo.update(run.id, current);

                const result = await this.importService.commitCandidate(candidate, ctx, async (done, total) => {
                    current = { ...current, currentImageProgress: { done, total } };
                    await this.runRepo.update(run.id, current);
                });
                // Re-read cancelRequested: a concurrent cancel() may have written it while commitCandidate
                // was in flight, and the full-document write below would otherwise clobber it back to false.
                const postCommit = await this.runRepo.getById(run.id);
                current = {
                    ...current,
                    cancelRequested: postCommit?.cancelRequested ?? current.cancelRequested,
                    processed: current.processed + 1,
                    created: current.created + (result.outcome === 'created' ? 1 : 0),
                    updated: current.updated + (result.outcome === 'updated' ? 1 : 0),
                    failed:
                        result.outcome === 'failed'
                            ? [...current.failed, { name: candidate.row.title.trim(), reason: result.reason }]
                            : current.failed,
                };
                await this.runRepo.update(run.id, current);
            }
            current = { ...current, ...cleared, status: 'completed', finishedAt: new Date() };
            await this.runRepo.update(run.id, current);
        } catch {
            await this.runRepo.update(run.id, { ...current, ...cleared, status: 'failed', finishedAt: new Date() });
        }
    }
}
