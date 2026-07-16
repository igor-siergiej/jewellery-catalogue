import { beforeEach, describe, expect, it, jest, mock } from 'bun:test';
import type { Logger } from '@imapps/api-utils';
import type { ImportCandidate, ImportRun } from '@jewellery-catalogue/types';
import type { DesignImportService } from '../DesignImportService';
import type { IdGenerator } from '../IdGenerator';
import type { ImportRunRepository } from '../ImportRunRepository';
import { ImportRunService } from './index';

const runs = new Map<string, ImportRun>();
const runRepo = {
    getByUserId: mock(async (userId: string) => [...runs.values()].filter((r) => r.userId === userId)),
    getByIdAndUserId: mock(async (id: string, userId: string) => {
        const run = runs.get(id);
        return run && run.userId === userId ? run : null;
    }),
    getById: mock(async (id: string) => runs.get(id) ?? null),
    findRunning: mock(
        async (userId: string) => [...runs.values()].find((r) => r.userId === userId && r.status === 'running') ?? null
    ),
    insert: mock(async (run: ImportRun) => {
        runs.set(run.id, run);
    }),
    update: mock(async (id: string, run: ImportRun) => {
        runs.set(id, run);
    }),
    requestCancel: mock(async (id: string) => {
        const run = runs.get(id);
        if (run && run.status === 'running') {
            runs.set(id, { ...run, cancelRequested: true });
        }
    }),
} satisfies ImportRunRepository;

const commitCandidate = mock<DesignImportService['commitCandidate']>(async () => ({ outcome: 'created' }));
const importService = {
    createCommitContext: mock(async () => ({ userId: 'u1', byKey: new Map(), resolver: {} })),
    commitCandidate,
} as unknown as DesignImportService;

let idc = 0;
const idGenerator: IdGenerator = { generate: () => `run-${++idc}` };

const candidate = (title: string): ImportCandidate =>
    ({
        row: { title, description: '', price: 1, quantity: 1, materials: [], imageUrls: [], sku: '' },
    }) as ImportCandidate;

const logger = { info: mock(() => {}), warn: mock(() => {}), error: mock(() => {}) };

const makeService = () => new ImportRunService(runRepo, importService, idGenerator, logger as unknown as Logger);

const awaitExecution = async (service: ImportRunService) => {
    await (service as unknown as { execution?: Promise<void> }).execution;
};

describe('ImportRunService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        runs.clear();
        idc = 0;
        commitCandidate.mockImplementation(async () => ({ outcome: 'created' }));
    });

    it('start returns a running run immediately and completes it in the background', async () => {
        const service = makeService();
        const run = await service.start({ candidates: [candidate('A'), candidate('B')], fileName: 'x.csv' }, 'u1');
        expect(run.status).toBe('running');
        expect(run.total).toBe(2);
        await awaitExecution(service);
        const finished = runs.get(run.id)!;
        expect(finished.status).toBe('completed');
        expect(finished.processed).toBe(2);
        expect(finished.created).toBe(2);
        expect(finished.finishedAt).toBeInstanceOf(Date);
    });

    it('accumulates per-candidate failures without stopping', async () => {
        commitCandidate
            .mockImplementationOnce(async () => ({ outcome: 'failed', reason: 'No images could be fetched' }))
            .mockImplementationOnce(async () => ({ outcome: 'updated' }));
        const service = makeService();
        const run = await service.start({ candidates: [candidate('Bad'), candidate('Good')], fileName: 'x.csv' }, 'u1');
        await awaitExecution(service);
        const finished = runs.get(run.id)!;
        expect(finished.status).toBe('completed');
        expect(finished.failed).toEqual([{ name: 'Bad', reason: 'No images could be fetched' }]);
        expect(finished.updated).toBe(1);
    });

    it('rejects a second start while a run is running', async () => {
        runs.set('run-existing', { id: 'run-existing', userId: 'u1', status: 'running' } as ImportRun);
        const service = makeService();
        await expect(service.start({ candidates: [], fileName: 'x.csv' }, 'u1')).rejects.toMatchObject({ status: 409 });
    });

    it('treats a stale running run as a zombie and starts a new one', async () => {
        runs.set('run-stale', {
            id: 'run-stale',
            userId: 'u1',
            status: 'running',
            startedAt: new Date(Date.now() - 16 * 60 * 1000),
        } as ImportRun);
        const service = makeService();
        const run = await service.start({ candidates: [candidate('A')], fileName: 'x.csv' }, 'u1');
        expect(run.status).toBe('running');
        expect(run.id).not.toBe('run-stale');
        const stale = runs.get('run-stale')!;
        expect(stale.status).toBe('failed');
        expect(stale.finishedAt).toBeInstanceOf(Date);
        expect(stale.currentListing).toBeUndefined();
        expect(stale.currentImageProgress).toBeUndefined();
    });

    it('rejects a second start when the running run is fresh', async () => {
        runs.set('run-fresh', {
            id: 'run-fresh',
            userId: 'u1',
            status: 'running',
            startedAt: new Date(),
        } as ImportRun);
        const service = makeService();
        await expect(service.start({ candidates: [], fileName: 'x.csv' }, 'u1')).rejects.toMatchObject({ status: 409 });
    });

    it('cancel stops the loop between candidates', async () => {
        commitCandidate.mockImplementation(async () => {
            const run = [...runs.values()][0];
            runs.set(run.id, { ...runs.get(run.id)!, cancelRequested: true });
            return { outcome: 'created' };
        });
        const service = makeService();
        const run = await service.start({ candidates: [candidate('A'), candidate('B')], fileName: 'x.csv' }, 'u1');
        await awaitExecution(service);
        const finished = runs.get(run.id)!;
        expect(finished.status).toBe('cancelled');
        expect(finished.processed).toBe(1);
    });

    it('cancel set between two onImageProgress writes survives and stops the run at that candidate', async () => {
        commitCandidate.mockImplementationOnce(async (_candidate, _ctx, onImageProgress) => {
            await onImageProgress?.(1, 3);
            const run = [...runs.values()][0];
            runs.set(run.id, { ...runs.get(run.id)!, cancelRequested: true });
            await onImageProgress?.(2, 3);
            return { outcome: 'created' };
        });
        const service = makeService();
        const run = await service.start({ candidates: [candidate('A'), candidate('B')], fileName: 'x.csv' }, 'u1');
        await awaitExecution(service);
        const finished = runs.get(run.id)!;
        expect(finished.status).toBe('cancelled');
        expect(finished.processed).toBe(1);
    });

    it('persists current listing and image progress, cleared on finish', async () => {
        commitCandidate.mockImplementation(async (_candidate, _ctx, onImageProgress) => {
            await onImageProgress?.(1, 3);
            const inFlight = [...runs.values()][0];
            expect(inFlight.currentListing).toBe('A');
            expect(inFlight.currentImageProgress).toEqual({ done: 1, total: 3 });
            return { outcome: 'created' };
        });
        const service = makeService();
        const run = await service.start({ candidates: [candidate('A')], fileName: 'x.csv' }, 'u1');
        await awaitExecution(service);
        const finished = runs.get(run.id)!;
        expect(finished.status).toBe('completed');
        expect(finished.currentListing).toBeUndefined();
        expect(finished.currentImageProgress).toBeUndefined();
    });

    it('marks the run failed when the worker throws unexpectedly', async () => {
        commitCandidate.mockImplementation(async () => {
            throw new Error('mongo down');
        });
        const service = makeService();
        const run = await service.start({ candidates: [candidate('A')], fileName: 'x.csv' }, 'u1');
        await awaitExecution(service);
        const finished = runs.get(run.id)!;
        expect(finished.status).toBe('failed');
        expect(finished.finishedAt).toBeInstanceOf(Date);
    });

    it('does not reject when persisting the terminal failure write itself fails', async () => {
        commitCandidate.mockImplementation(async () => {
            throw new Error('mongo down');
        });
        runRepo.update
            .mockImplementationOnce(async (id: string, run: ImportRun) => {
                runs.set(id, run);
            })
            .mockImplementationOnce(async () => {
                throw new Error('db unreachable');
            });
        const service = makeService();
        const run = await service.start({ candidates: [candidate('A')], fileName: 'x.csv' }, 'u1');
        await expect(awaitExecution(service)).resolves.toBeUndefined();
        expect(logger.error).toHaveBeenCalledTimes(2);
        expect(runs.get(run.id)!.status).toBe('running');
    });

    it('cancel is a no-op on a finished run', async () => {
        runs.set('run-done', {
            id: 'run-done',
            userId: 'u1',
            status: 'completed',
            cancelRequested: false,
        } as ImportRun);
        const service = makeService();
        const result = await service.cancel('run-done', 'u1');
        expect(result.status).toBe('completed');
        expect(result.cancelRequested).toBe(false);
    });

    it('getRun throws 404 for another user', async () => {
        runs.set('run-1', { id: 'run-1', userId: 'other' } as ImportRun);
        const service = makeService();
        await expect(makeService().getRun('run-1', 'u1')).rejects.toMatchObject({ status: 404 });
    });
});
