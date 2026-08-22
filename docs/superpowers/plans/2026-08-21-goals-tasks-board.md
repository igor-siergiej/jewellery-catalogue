# Goals/Tasks Board Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Kanban-style Goals/Tasks board to jewellery-catalogue for tracking business work across marketing, product, and finance, plus lightweight goal-progress bars (e.g. "20/50 listings").

**Architecture:** Two new backend resources — `Task` and `Goal` — follow the existing layered pattern (type → domain repo → domain service → Mongo repo → handler → route → DI wiring), mirroring `Material`. Frontend adds a `Board` page with a 3-column Kanban (`dnd-kit` drag/drop), an Add/Edit Task dialog, and a Goals panel with progress bars. Recurring tasks (daily/weekly) auto-spawn their next occurrence when marked Done, handled in `TaskService`.

**Tech Stack:** Bun workspaces, Hono (API), MongoDB, Zod (`@jewellery-catalogue/types`), React Router v7, `@tanstack/react-query`, shadcn/ui (Radix + Tailwind), `bun:test`. New dependency: `@dnd-kit/core` + `@dnd-kit/sortable` (frontend only).

**Spec:** This plan's Requirements section below (no separate spec doc — captured from user conversation + reference screenshot of a "Handmade Business Planner" app, used as inspiration only, not a 1:1 clone target).

## Requirements

- Board with 3 columns: To Do, In Progress, Done.
- Creating a task sets: title, due date, subject (`marketing` | `product` | `finance`), importance (`low` | `medium` | `high`), recurrence (`none` | `daily` | `weekly`).
- Marking a recurring task Done auto-creates the next occurrence (due date shifted +1 day or +7 days).
- Goals show progress as `current/target` (e.g. "20/50") with a progress bar, created/edited independently of tasks.
- A goal's `currentValue` can be manual, or sourced live from Etsy (active listings count / total sales count) via a "Track from" dropdown at creation, with a manual re-sync action.
- The board can be filtered by subject (single-select) and by importance (multi-select), independent of column/status.

## Global Constraints

- Follow existing layered backend pattern exactly (see `MaterialRepository`/`MaterialService`/`MongoMaterialRepository`/`handlers/Material`) — do not introduce a different architecture for this feature.
- All new Mongo documents use string `id` (not ObjectId) — `usesObjectId()` returns `false`, matching every existing repository.
- All new types live in `packages/types` as Zod schemas with inferred TS types, exported from `packages/types/src/index.ts`.
- Every new API route is registered with the existing `authenticate` middleware and scoped by `userId` (no cross-user data leakage).
- Frontend fetches go through `makeRequestWithAutoRefresh` via a per-endpoint module in `packages/web/src/api/endpoints/<name>/index.ts`, exactly like `getMaterials`.
- Tests use `bun:test` (`describe`/`it`/`expect`/`mock`), colocated as `index.test.ts` next to the unit under test, mocking repositories the same way `MaterialService/index.test.ts` does.
- Each task below is one independently shippable PR. Do not bundle tasks.

---

### Task 1: Backend — Task domain (types, repo, service, Mongo impl, routes)

**Files:**
- Create: `packages/types/src/task/index.ts`
- Modify: `packages/types/src/index.ts` (add `export * from './task/index';`)
- Create: `packages/api/src/domain/TaskRepository/index.ts`
- Create: `packages/api/src/domain/TaskService/index.ts`
- Create: `packages/api/src/domain/TaskService/index.test.ts`
- Create: `packages/api/src/infrastructure/MongoTaskRepository/index.ts`
- Create: `packages/api/src/handlers/Task/index.ts`
- Modify: `packages/api/src/routes/index.ts` (register task routes + import)
- Modify: `packages/api/src/dependencies/types.ts` (add `Tasks` to `Collections`, `TaskRepository`/`TaskService` tokens)
- Modify: `packages/api/src/dependencies/index.ts` (wire `MongoTaskRepository` + `TaskService`)

**Interfaces:**
- Produces: `Task`, `FormTask`, `UpdateTask`, `TaskStatus` (`'todo' | 'in_progress' | 'done'`), `TaskSubject` (`'marketing' | 'product' | 'finance'`), `TaskImportance` (`'low' | 'medium' | 'high'`), `TaskRecurrence` (`'none' | 'daily' | 'weekly'`) — consumed by Task 3 (frontend API layer) and Task 7 (recurrence logic).
- Produces: `TaskService.getTasksByUserId(userId): Promise<Task[]>`, `.addTask(data: FormTask, userId): Promise<Task>`, `.updateTask(id, updates: UpdateTask, userId): Promise<Task>`, `.deleteTask(id, userId): Promise<void>` — consumed by handler and Task 7.
- Consumes: `IdGenerator.generate()` (existing).

- [x] **Step 1: Add the `Task` type**

```typescript
// packages/types/src/task/index.ts
import { z } from 'zod';

export const taskSubjectEnum = z.enum(['marketing', 'product', 'finance']);
export type TaskSubject = z.infer<typeof taskSubjectEnum>;

export const taskImportanceEnum = z.enum(['low', 'medium', 'high']);
export type TaskImportance = z.infer<typeof taskImportanceEnum>;

export const taskRecurrenceEnum = z.enum(['none', 'daily', 'weekly']);
export type TaskRecurrence = z.infer<typeof taskRecurrenceEnum>;

export const taskStatusEnum = z.enum(['todo', 'in_progress', 'done']);
export type TaskStatus = z.infer<typeof taskStatusEnum>;

export const taskSchema = z.object({
    id: z.string(),
    userId: z.string(),
    title: z.string().min(1),
    subject: taskSubjectEnum,
    importance: taskImportanceEnum,
    recurrence: taskRecurrenceEnum,
    status: taskStatusEnum,
    dueDate: z.coerce.date().optional(),
    goalId: z.string().optional(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
});
export type Task = z.infer<typeof taskSchema>;

export const formTaskSchema = z.object({
    title: z.string().min(1),
    subject: taskSubjectEnum,
    importance: taskImportanceEnum,
    recurrence: taskRecurrenceEnum,
    dueDate: z.coerce.date().optional(),
    goalId: z.string().optional(),
});
export type FormTask = z.infer<typeof formTaskSchema>;

export const updateTaskSchema = taskSchema.partial().omit({ id: true, userId: true, createdAt: true });
export type UpdateTask = z.infer<typeof updateTaskSchema>;
```

Add `export * from './task/index';` to `packages/types/src/index.ts` (alphabetical position, after `./requiredMaterial/index`, before `./updateDesign/index`).

- [x] **Step 2: Define the repository interface**

```typescript
// packages/api/src/domain/TaskRepository/index.ts
import type { Task } from '@jewellery-catalogue/types';

import type { BaseRepository } from '../BaseRepository';

export interface TaskRepository extends BaseRepository<Task> {
    getByUserId(userId: string): Promise<Array<Task>>;
    getByIdAndUserId(id: string, userId: string): Promise<Task | null>;
}
```

- [x] **Step 3: Write the failing service test**

```typescript
// packages/api/src/domain/TaskService/index.test.ts
import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { FormTask, Task } from '@jewellery-catalogue/types';

import type { IdGenerator } from '../IdGenerator';
import type { TaskRepository } from '../TaskRepository';
import { TaskService } from './index';

const mockTaskRepo: TaskRepository = {
    getById: mock(),
    getByIdAndUserId: mock(),
    getByUserId: mock(),
    getAll: mock(),
    insert: mock(),
    update: mock(),
    delete: mock(),
};

const mockIdGenerator: IdGenerator = { generate: mock() };

const formTask: FormTask = {
    title: 'Add 50 more listings',
    subject: 'product',
    importance: 'high',
    recurrence: 'none',
    dueDate: new Date('2026-09-01T00:00:00.000Z'),
};

describe('TaskService', () => {
    let service: TaskService;

    beforeEach(() => {
        mock.restore();
        service = new TaskService(mockTaskRepo, mockIdGenerator);
    });

    it('addTask throws 400 when userId is missing', async () => {
        await expect(service.addTask(formTask, '')).rejects.toMatchObject({ status: 400 });
    });

    it('addTask inserts a task with generated id, todo status, and timestamps', async () => {
        (mockIdGenerator.generate as ReturnType<typeof mock>).mockReturnValue('task-1');

        const result = await service.addTask(formTask, 'user-1');

        expect(result).toMatchObject({
            id: 'task-1',
            userId: 'user-1',
            title: 'Add 50 more listings',
            status: 'todo',
        });
        expect(mockTaskRepo.insert).toHaveBeenCalledWith(result);
    });

    it('getTasksByUserId throws 400 when userId is missing', async () => {
        await expect(service.getTasksByUserId('')).rejects.toMatchObject({ status: 400 });
    });

    it('updateTask throws 404 when task does not exist', async () => {
        (mockTaskRepo.getByIdAndUserId as ReturnType<typeof mock>).mockResolvedValue(null);

        await expect(service.updateTask('task-1', { status: 'done' }, 'user-1')).rejects.toMatchObject({
            status: 404,
        });
    });

    it('updateTask merges updates and bumps updatedAt', async () => {
        const existing: Task = {
            id: 'task-1',
            userId: 'user-1',
            title: 'Add 50 more listings',
            subject: 'product',
            importance: 'high',
            recurrence: 'none',
            status: 'todo',
            createdAt: new Date('2026-08-01T00:00:00.000Z'),
            updatedAt: new Date('2026-08-01T00:00:00.000Z'),
        };
        (mockTaskRepo.getByIdAndUserId as ReturnType<typeof mock>).mockResolvedValue(existing);

        const result = await service.updateTask('task-1', { status: 'in_progress' }, 'user-1');

        expect(result.status).toBe('in_progress');
        expect(result.updatedAt.getTime()).toBeGreaterThan(existing.updatedAt.getTime());
        expect(mockTaskRepo.update).toHaveBeenCalledWith('task-1', result);
    });

    it('deleteTask throws 404 when task does not exist', async () => {
        (mockTaskRepo.getByIdAndUserId as ReturnType<typeof mock>).mockResolvedValue(null);

        await expect(service.deleteTask('task-1', 'user-1')).rejects.toMatchObject({ status: 404 });
    });
});
```

- [x] **Step 4: Run test to verify it fails**

Run: `bun test packages/api/src/domain/TaskService/index.test.ts`
Expected: FAIL — `Cannot find module './index'` (TaskService doesn't exist yet).

- [x] **Step 5: Implement `TaskService`**

```typescript
// packages/api/src/domain/TaskService/index.ts
import type { FormTask, Task, UpdateTask } from '@jewellery-catalogue/types';

import type { IdGenerator } from '../IdGenerator';
import type { TaskRepository } from '../TaskRepository';

export class TaskService {
    constructor(
        private readonly taskRepo: TaskRepository,
        private readonly idGenerator: IdGenerator
    ) {}

    async getTasksByUserId(userId: string): Promise<Array<Task>> {
        if (!userId) {
            throw Object.assign(new Error('User ID is required'), { status: 400 });
        }
        return this.taskRepo.getByUserId(userId);
    }

    async addTask(taskData: FormTask, userId: string): Promise<Task> {
        if (!userId) {
            throw Object.assign(new Error('User ID is required'), { status: 400 });
        }

        const now = new Date();
        const task: Task = {
            id: this.idGenerator.generate(),
            userId,
            title: taskData.title,
            subject: taskData.subject,
            importance: taskData.importance,
            recurrence: taskData.recurrence,
            status: 'todo',
            dueDate: taskData.dueDate,
            goalId: taskData.goalId,
            createdAt: now,
            updatedAt: now,
        };

        await this.taskRepo.insert(task);

        return task;
    }

    async updateTask(id: string, updates: UpdateTask, userId: string): Promise<Task> {
        if (!userId) {
            throw Object.assign(new Error('User ID is required'), { status: 400 });
        }

        const existing = await this.taskRepo.getByIdAndUserId(id, userId);

        if (!existing) {
            throw Object.assign(new Error('Task not found'), { status: 404 });
        }

        const updated: Task = { ...existing, ...updates, updatedAt: new Date() };

        await this.taskRepo.update(id, updated);

        return updated;
    }

    async deleteTask(id: string, userId: string): Promise<void> {
        if (!userId) {
            throw Object.assign(new Error('User ID is required'), { status: 400 });
        }

        const existing = await this.taskRepo.getByIdAndUserId(id, userId);

        if (!existing) {
            throw Object.assign(new Error('Task not found'), { status: 404 });
        }

        await this.taskRepo.delete(id);
    }
}
```

- [x] **Step 6: Run test to verify it passes**

Run: `bun test packages/api/src/domain/TaskService/index.test.ts`
Expected: PASS (all 6 cases).

- [x] **Step 7: Mongo repository implementation**

```typescript
// packages/api/src/infrastructure/MongoTaskRepository/index.ts
import type { MongoDbConnection } from '@imapps/api-utils';
import type { Task } from '@jewellery-catalogue/types';

import { CollectionNames, type Collections } from '../../dependencies/types';
import type { TaskRepository } from '../../domain/TaskRepository';
import { MongoRepository } from '../MongoRepository';

export class MongoTaskRepository extends MongoRepository<Task> implements TaskRepository {
    constructor(db: MongoDbConnection<Collections>) {
        super(db, CollectionNames.Tasks);
    }

    protected usesObjectId(): boolean {
        return false;
    }

    async getByUserId(userId: string): Promise<Array<Task>> {
        return this.collection()
            .find({ userId }, { projection: { _id: 0 } })
            .toArray();
    }

    async getByIdAndUserId(id: string, userId: string): Promise<Task | null> {
        return this.collection().findOne({ id, userId }, { projection: { _id: 0 } });
    }
}
```

- [x] **Step 8: Handler**

```typescript
// packages/api/src/handlers/Task/index.ts
import type { FormTask, UpdateTask } from '@jewellery-catalogue/types';
import type { Context } from 'hono';

import { dependencyContainer } from '../../dependencies';
import { DependencyToken } from '../../dependencies/types';
import type { TaskService } from '../../domain/TaskService';

type Ctx = Context<{ Variables: { userId: string } }>;

const getTaskService = (): TaskService => dependencyContainer.resolve(DependencyToken.TaskService);

export const getTasks = async (c: Ctx) => {
    const tasks = await getTaskService().getTasksByUserId(c.get('userId'));
    return c.json(tasks);
};

export const addTask = async (c: Ctx) => {
    const taskData = (await c.req.json()) as FormTask;
    const task = await getTaskService().addTask(taskData, c.get('userId'));
    return c.json(task, 200);
};

export const updateTask = async (c: Ctx) => {
    const updates = (await c.req.json()) as UpdateTask;
    const task = await getTaskService().updateTask(c.req.param('id'), updates, c.get('userId'));
    return c.json(task);
};

export const deleteTask = async (c: Ctx) => {
    await getTaskService().deleteTask(c.req.param('id'), c.get('userId'));
    return c.json({ message: 'Task deleted successfully' }, 200);
};
```

- [x] **Step 9: Register routes**

In `packages/api/src/routes/index.ts`, add import `import { addTask, deleteTask, getTasks, updateTask } from '../handlers/Task';` and register above the images routes:

```typescript
app.get('/api/tasks', authenticate, getTasks);
app.post('/api/tasks', authenticate, addTask);
app.put('/api/tasks/:id', authenticate, updateTask);
app.delete('/api/tasks/:id', authenticate, deleteTask);
```

- [x] **Step 10: DI wiring**

In `packages/api/src/dependencies/types.ts`:
- Add `Task` to the `Collections` type import and map: `[CollectionNames.Tasks]: Task;`
- Add `Tasks = 'tasks'` to `CollectionNames` enum.
- Add `TaskRepository = 'TaskRepository'` and `TaskService = 'TaskService'` to `DependencyToken`.
- Add both to the `Dependencies` type (`[DependencyToken.TaskRepository]: TaskRepository;`, `[DependencyToken.TaskService]: TaskService;`), importing the two interfaces.

In `packages/api/src/dependencies/index.ts`, import `TaskService` and `MongoTaskRepository`, then register (after the Material repo/service block):

```typescript
dependencyContainer.registerSingleton(
    DependencyToken.TaskRepository,
    class {
        constructor() {
            return new MongoTaskRepository(dependencyContainer.resolve(DependencyToken.Database));
        }
    } as any
);

dependencyContainer.registerSingleton(
    DependencyToken.TaskService,
    class {
        constructor() {
            return new TaskService(
                dependencyContainer.resolve(DependencyToken.TaskRepository),
                dependencyContainer.resolve(DependencyToken.IdGenerator)
            );
        }
    } as any
);
```

- [x] **Step 11: Run full API test suite**

Run: `bun test packages/api`
Expected: PASS, no regressions.

- [x] **Step 12: Commit**

```bash
git add packages/types/src/task packages/types/src/index.ts packages/api/src/domain/TaskRepository packages/api/src/domain/TaskService packages/api/src/infrastructure/MongoTaskRepository packages/api/src/handlers/Task packages/api/src/routes/index.ts packages/api/src/dependencies/types.ts packages/api/src/dependencies/index.ts
git commit -m "feat: add Task domain with CRUD API"
```

---

### Task 2: Backend — Goal domain (types, repo, service, Mongo impl, routes, Etsy-sourced values)

**Files:**
- Create: `packages/types/src/goal/index.ts`
- Modify: `packages/types/src/index.ts` (add `export * from './goal/index';`)
- Create: `packages/api/src/domain/GoalRepository/index.ts`
- Create: `packages/api/src/domain/GoalService/index.ts`
- Create: `packages/api/src/domain/GoalService/index.test.ts`
- Create: `packages/api/src/infrastructure/MongoGoalRepository/index.ts`
- Create: `packages/api/src/handlers/Goal/index.ts`
- Modify: `packages/api/src/domain/EtsyClient/index.ts` (extend `getShop()` to also return `listingActiveCount` and `transactionSoldCount`)
- Modify: `packages/api/src/routes/index.ts`
- Modify: `packages/api/src/dependencies/types.ts`
- Modify: `packages/api/src/dependencies/index.ts`

**Interfaces:**
- Produces: `Goal`, `FormGoal`, `UpdateGoal`, `GoalSource` (`'manual' | 'etsy_active_listings' | 'etsy_sales_count'`) — consumed by Task 3 (frontend API layer), Task 6 (progress widgets + the "Track from" dropdown).
- Produces: `GoalService.getGoalsByUserId(userId)`, `.addGoal(data, userId)`, `.updateGoal(id, updates, userId)` (manual `currentValue` bumps), `.deleteGoal(id, userId)`, `.syncFromEtsy(id, userId)` (re-pulls `currentValue` from Etsy for a non-manual goal) — consumed by the handler and the frontend "sync" action in Task 6.
- Consumes: `IdGenerator` (existing); `EtsyClient.getShop(shopId)` (existing, extended here) and `EtsyConnectionRepository.getByUserId(userId)` (existing, from the prior Etsy integration work — see `EtsyConnectionService`) for pulling live shop metrics. No dependency on Task 1's code — still safe to run in parallel with it.

**Why `getShop`, not a new endpoint:** `GET /v3/application/shops/{shop_id}` (no OAuth scope required) already returns `listing_active_count` and `transaction_sold_count` on the shop object — exactly the two numbers needed for "listings added" and "sales" goals. `EtsyClient.getShop()` already exists (used by `EtsyConnectionService.handleCallback`) and currently discards those two fields — this task just adds them to its return type.

- [ ] **Step 1: Add the `Goal` type with a `source` field**

```typescript
// packages/types/src/goal/index.ts
import { z } from 'zod';

export const goalSourceEnum = z.enum(['manual', 'etsy_active_listings', 'etsy_sales_count']);
export type GoalSource = z.infer<typeof goalSourceEnum>;

export const goalSchema = z.object({
    id: z.string(),
    userId: z.string(),
    title: z.string().min(1),
    targetValue: z.number().positive(),
    currentValue: z.number().nonnegative(),
    unit: z.string().optional(),
    source: goalSourceEnum,
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
});
export type Goal = z.infer<typeof goalSchema>;

export const formGoalSchema = z.object({
    title: z.string().min(1),
    targetValue: z.number().positive(),
    currentValue: z.number().nonnegative().default(0),
    unit: z.string().optional(),
    source: goalSourceEnum.default('manual'),
});
export type FormGoal = z.infer<typeof formGoalSchema>;

export const updateGoalSchema = goalSchema.partial().omit({ id: true, userId: true, createdAt: true });
export type UpdateGoal = z.infer<typeof updateGoalSchema>;
```

`currentValue` on `FormGoal` is only read for `source: 'manual'` — for the two Etsy sources, `GoalService.addGoal` overwrites it with a live-fetched value (Step 5).

Add `export * from './goal/index';` to `packages/types/src/index.ts` (alphabetical, after `./formMaterial/index`, before `./material/enum`).

- [ ] **Step 2: Repository interface**

```typescript
// packages/api/src/domain/GoalRepository/index.ts
import type { Goal } from '@jewellery-catalogue/types';

import type { BaseRepository } from '../BaseRepository';

export interface GoalRepository extends BaseRepository<Goal> {
    getByUserId(userId: string): Promise<Array<Goal>>;
    getByIdAndUserId(id: string, userId: string): Promise<Goal | null>;
}
```

- [ ] **Step 3: Extend `EtsyClient.getShop` to return the two metrics**

In `packages/api/src/domain/EtsyClient/index.ts`, replace the existing `getShop` method:

```typescript
async getShop(shopId: number): Promise<{
    shopId: number;
    shopName: string;
    listingActiveCount: number;
    transactionSoldCount: number;
}> {
    const response = await fetch(`${API_BASE}/shops/${shopId}`, {
        headers: { 'x-api-key': this.apiKeyHeader() },
    });

    if (!response.ok) {
        throw await etsyError('getShop', response);
    }

    const body = (await response.json()) as {
        shop_id: number;
        shop_name: string;
        listing_active_count: number;
        transaction_sold_count: number;
    };

    return {
        shopId: body.shop_id,
        shopName: body.shop_name,
        listingActiveCount: body.listing_active_count,
        transactionSoldCount: body.transaction_sold_count,
    };
}
```

`EtsyConnectionService.handleCallback` destructures `{ shopId, shopName }` from this call already — adding fields to the return type is additive and doesn't break that call site.

- [ ] **Step 4: Write the failing service test**

```typescript
// packages/api/src/domain/GoalService/index.test.ts
import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { EtsyConnection, FormGoal, Goal } from '@jewellery-catalogue/types';

import type { EtsyClient } from '../EtsyClient';
import type { EtsyConnectionRepository } from '../EtsyConnectionRepository';
import type { GoalRepository } from '../GoalRepository';
import type { IdGenerator } from '../IdGenerator';
import { GoalService } from './index';

const mockGoalRepo: GoalRepository = {
    getById: mock(),
    getByIdAndUserId: mock(),
    getByUserId: mock(),
    getAll: mock(),
    insert: mock(),
    update: mock(),
    delete: mock(),
};

const mockIdGenerator: IdGenerator = { generate: mock() };

const mockEtsyClient = { getShop: mock() } as unknown as EtsyClient;

const mockEtsyConnectionRepo = {
    getByUserId: mock(),
} as unknown as EtsyConnectionRepository;

const connection: EtsyConnection = {
    userId: 'user-1',
    shopId: 47408839,
    shopName: "Jane's Studio",
    accessToken: 'tok',
    accessTokenExpiresAt: Date.now() + 100_000,
    refreshToken: 'refresh',
    connectedAt: Date.now(),
};

const formGoal: FormGoal = { title: 'Add 50 more listings', targetValue: 50, currentValue: 0, source: 'manual' };

describe('GoalService', () => {
    let service: GoalService;

    beforeEach(() => {
        mock.restore();
        service = new GoalService(mockGoalRepo, mockIdGenerator, mockEtsyClient, mockEtsyConnectionRepo);
    });

    it('addGoal throws 400 when userId is missing', async () => {
        await expect(service.addGoal(formGoal, '')).rejects.toMatchObject({ status: 400 });
    });

    it('addGoal throws 400 when targetValue is not positive', async () => {
        await expect(service.addGoal({ ...formGoal, targetValue: 0 }, 'user-1')).rejects.toMatchObject({
            status: 400,
        });
    });

    it('addGoal inserts a manual goal with generated id and given currentValue', async () => {
        (mockIdGenerator.generate as ReturnType<typeof mock>).mockReturnValue('goal-1');

        const result = await service.addGoal(formGoal, 'user-1');

        expect(result).toMatchObject({ id: 'goal-1', userId: 'user-1', targetValue: 50, currentValue: 0, source: 'manual' });
        expect(mockGoalRepo.insert).toHaveBeenCalledWith(result);
        expect(mockEtsyClient.getShop).not.toHaveBeenCalled();
    });

    it('addGoal fetches currentValue from Etsy when source is etsy_active_listings', async () => {
        (mockIdGenerator.generate as ReturnType<typeof mock>).mockReturnValue('goal-2');
        (mockEtsyConnectionRepo.getByUserId as ReturnType<typeof mock>).mockResolvedValue(connection);
        (mockEtsyClient.getShop as ReturnType<typeof mock>).mockResolvedValue({
            shopId: 47408839,
            shopName: "Jane's Studio",
            listingActiveCount: 20,
            transactionSoldCount: 238,
        });

        const result = await service.addGoal(
            { title: 'Add 50 more listings', targetValue: 50, source: 'etsy_active_listings' } as FormGoal,
            'user-1'
        );

        expect(mockEtsyClient.getShop).toHaveBeenCalledWith(47408839);
        expect(result.currentValue).toBe(20);
    });

    it('addGoal throws 400 when Etsy-sourced and Etsy is not connected', async () => {
        (mockEtsyConnectionRepo.getByUserId as ReturnType<typeof mock>).mockResolvedValue(null);

        await expect(
            service.addGoal(
                { title: 'Reach 500 sales', targetValue: 500, source: 'etsy_sales_count' } as FormGoal,
                'user-1'
            )
        ).rejects.toMatchObject({ status: 400 });
    });

    it('updateGoal throws 404 when goal does not exist', async () => {
        (mockGoalRepo.getByIdAndUserId as ReturnType<typeof mock>).mockResolvedValue(null);

        await expect(service.updateGoal('goal-1', { currentValue: 20 }, 'user-1')).rejects.toMatchObject({
            status: 404,
        });
    });

    it('updateGoal merges currentValue and bumps updatedAt', async () => {
        const existing: Goal = {
            id: 'goal-1',
            userId: 'user-1',
            title: 'Add 50 more listings',
            targetValue: 50,
            currentValue: 0,
            source: 'manual',
            createdAt: new Date('2026-08-01T00:00:00.000Z'),
            updatedAt: new Date('2026-08-01T00:00:00.000Z'),
        };
        (mockGoalRepo.getByIdAndUserId as ReturnType<typeof mock>).mockResolvedValue(existing);

        const result = await service.updateGoal('goal-1', { currentValue: 20 }, 'user-1');

        expect(result.currentValue).toBe(20);
        expect(mockGoalRepo.update).toHaveBeenCalledWith('goal-1', result);
    });

    it('deleteGoal throws 404 when goal does not exist', async () => {
        (mockGoalRepo.getByIdAndUserId as ReturnType<typeof mock>).mockResolvedValue(null);

        await expect(service.deleteGoal('goal-1', 'user-1')).rejects.toMatchObject({ status: 404 });
    });

    it('syncFromEtsy throws 400 for a manual goal', async () => {
        const existing: Goal = {
            id: 'goal-1',
            userId: 'user-1',
            title: 'Add 50 more listings',
            targetValue: 50,
            currentValue: 10,
            source: 'manual',
            createdAt: new Date('2026-08-01T00:00:00.000Z'),
            updatedAt: new Date('2026-08-01T00:00:00.000Z'),
        };
        (mockGoalRepo.getByIdAndUserId as ReturnType<typeof mock>).mockResolvedValue(existing);

        await expect(service.syncFromEtsy('goal-1', 'user-1')).rejects.toMatchObject({ status: 400 });
    });

    it('syncFromEtsy re-fetches transaction_sold_count for an etsy_sales_count goal', async () => {
        const existing: Goal = {
            id: 'goal-1',
            userId: 'user-1',
            title: 'Reach 500 sales',
            targetValue: 500,
            currentValue: 200,
            source: 'etsy_sales_count',
            createdAt: new Date('2026-08-01T00:00:00.000Z'),
            updatedAt: new Date('2026-08-01T00:00:00.000Z'),
        };
        (mockGoalRepo.getByIdAndUserId as ReturnType<typeof mock>).mockResolvedValue(existing);
        (mockEtsyConnectionRepo.getByUserId as ReturnType<typeof mock>).mockResolvedValue(connection);
        (mockEtsyClient.getShop as ReturnType<typeof mock>).mockResolvedValue({
            shopId: 47408839,
            shopName: "Jane's Studio",
            listingActiveCount: 20,
            transactionSoldCount: 238,
        });

        const result = await service.syncFromEtsy('goal-1', 'user-1');

        expect(result.currentValue).toBe(238);
        expect(mockGoalRepo.update).toHaveBeenCalledWith('goal-1', result);
    });
});
```

- [ ] **Step 5: Run test to verify it fails**

Run: `bun test packages/api/src/domain/GoalService/index.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 6: Implement `GoalService`**

```typescript
// packages/api/src/domain/GoalService/index.ts
import { formGoalSchema, type FormGoal, type Goal, type GoalSource, type UpdateGoal } from '@jewellery-catalogue/types';

import type { EtsyClient } from '../EtsyClient';
import type { EtsyConnectionRepository } from '../EtsyConnectionRepository';
import type { GoalRepository } from '../GoalRepository';
import type { IdGenerator } from '../IdGenerator';

export class GoalService {
    constructor(
        private readonly goalRepo: GoalRepository,
        private readonly idGenerator: IdGenerator,
        private readonly etsyClient: EtsyClient,
        private readonly etsyConnectionRepo: EtsyConnectionRepository
    ) {}

    async getGoalsByUserId(userId: string): Promise<Array<Goal>> {
        if (!userId) {
            throw Object.assign(new Error('User ID is required'), { status: 400 });
        }
        return this.goalRepo.getByUserId(userId);
    }

    async addGoal(goalData: FormGoal, userId: string): Promise<Goal> {
        if (!userId) {
            throw Object.assign(new Error('User ID is required'), { status: 400 });
        }

        const result = formGoalSchema.safeParse(goalData);
        if (!result.success) {
            throw Object.assign(new Error('Invalid goal data'), { status: 400 });
        }

        const now = new Date();
        const currentValue =
            result.data.source === 'manual'
                ? (result.data.currentValue ?? 0)
                : await this.fetchEtsyValue(result.data.source, userId);

        const goal: Goal = {
            id: this.idGenerator.generate(),
            userId,
            title: result.data.title,
            targetValue: result.data.targetValue,
            currentValue,
            unit: result.data.unit,
            source: result.data.source,
            createdAt: now,
            updatedAt: now,
        };

        await this.goalRepo.insert(goal);

        return goal;
    }

    async updateGoal(id: string, updates: UpdateGoal, userId: string): Promise<Goal> {
        if (!userId) {
            throw Object.assign(new Error('User ID is required'), { status: 400 });
        }

        const existing = await this.goalRepo.getByIdAndUserId(id, userId);

        if (!existing) {
            throw Object.assign(new Error('Goal not found'), { status: 404 });
        }

        const updated: Goal = { ...existing, ...updates, updatedAt: new Date() };

        await this.goalRepo.update(id, updated);

        return updated;
    }

    async syncFromEtsy(id: string, userId: string): Promise<Goal> {
        if (!userId) {
            throw Object.assign(new Error('User ID is required'), { status: 400 });
        }

        const existing = await this.goalRepo.getByIdAndUserId(id, userId);

        if (!existing) {
            throw Object.assign(new Error('Goal not found'), { status: 404 });
        }

        if (existing.source === 'manual') {
            throw Object.assign(new Error('Goal is not linked to Etsy'), { status: 400 });
        }

        const currentValue = await this.fetchEtsyValue(existing.source, userId);
        const updated: Goal = { ...existing, currentValue, updatedAt: new Date() };

        await this.goalRepo.update(id, updated);

        return updated;
    }

    async deleteGoal(id: string, userId: string): Promise<void> {
        if (!userId) {
            throw Object.assign(new Error('User ID is required'), { status: 400 });
        }

        const existing = await this.goalRepo.getByIdAndUserId(id, userId);

        if (!existing) {
            throw Object.assign(new Error('Goal not found'), { status: 404 });
        }

        await this.goalRepo.delete(id);
    }

    private async fetchEtsyValue(source: GoalSource, userId: string): Promise<number> {
        const connection = await this.etsyConnectionRepo.getByUserId(userId);

        if (!connection) {
            throw Object.assign(new Error('Etsy is not connected'), { status: 400 });
        }

        const shop = await this.etsyClient.getShop(connection.shopId);

        return source === 'etsy_active_listings' ? shop.listingActiveCount : shop.transactionSoldCount;
    }
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `bun test packages/api/src/domain/GoalService/index.test.ts`
Expected: PASS (all 10 cases).

- [ ] **Step 8: Mongo repository implementation**

```typescript
// packages/api/src/infrastructure/MongoGoalRepository/index.ts
import type { MongoDbConnection } from '@imapps/api-utils';
import type { Goal } from '@jewellery-catalogue/types';

import { CollectionNames, type Collections } from '../../dependencies/types';
import type { GoalRepository } from '../../domain/GoalRepository';
import { MongoRepository } from '../MongoRepository';

export class MongoGoalRepository extends MongoRepository<Goal> implements GoalRepository {
    constructor(db: MongoDbConnection<Collections>) {
        super(db, CollectionNames.Goals);
    }

    protected usesObjectId(): boolean {
        return false;
    }

    async getByUserId(userId: string): Promise<Array<Goal>> {
        return this.collection()
            .find({ userId }, { projection: { _id: 0 } })
            .toArray();
    }

    async getByIdAndUserId(id: string, userId: string): Promise<Goal | null> {
        return this.collection().findOne({ id, userId }, { projection: { _id: 0 } });
    }
}
```

- [ ] **Step 9: Handler**

```typescript
// packages/api/src/handlers/Goal/index.ts
import type { FormGoal, UpdateGoal } from '@jewellery-catalogue/types';
import type { Context } from 'hono';

import { dependencyContainer } from '../../dependencies';
import { DependencyToken } from '../../dependencies/types';
import type { GoalService } from '../../domain/GoalService';

type Ctx = Context<{ Variables: { userId: string } }>;

const getGoalService = (): GoalService => dependencyContainer.resolve(DependencyToken.GoalService);

export const getGoals = async (c: Ctx) => {
    const goals = await getGoalService().getGoalsByUserId(c.get('userId'));
    return c.json(goals);
};

export const addGoal = async (c: Ctx) => {
    const goalData = (await c.req.json()) as FormGoal;
    const goal = await getGoalService().addGoal(goalData, c.get('userId'));
    return c.json(goal, 200);
};

export const updateGoal = async (c: Ctx) => {
    const updates = (await c.req.json()) as UpdateGoal;
    const goal = await getGoalService().updateGoal(c.req.param('id'), updates, c.get('userId'));
    return c.json(goal);
};

export const syncGoalEtsyValue = async (c: Ctx) => {
    const goal = await getGoalService().syncFromEtsy(c.req.param('id'), c.get('userId'));
    return c.json(goal);
};

export const deleteGoal = async (c: Ctx) => {
    await getGoalService().deleteGoal(c.req.param('id'), c.get('userId'));
    return c.json({ message: 'Goal deleted successfully' }, 200);
};
```

- [ ] **Step 10: Register routes**

In `packages/api/src/routes/index.ts`, add import `import { addGoal, deleteGoal, getGoals, syncGoalEtsyValue, updateGoal } from '../handlers/Goal';` and:

```typescript
app.get('/api/goals', authenticate, getGoals);
app.post('/api/goals', authenticate, addGoal);
app.put('/api/goals/:id', authenticate, updateGoal);
app.post('/api/goals/:id/etsy-sync', authenticate, syncGoalEtsyValue);
app.delete('/api/goals/:id', authenticate, deleteGoal);
```

(Mirrors the existing `/api/designs/:id/etsy-sync-quantity` action-endpoint convention already used by `EtsyStatusService`.)

- [ ] **Step 11: DI wiring**

Same shape as Task 1 Step 10, plus the two extra constructor dependencies: add `Goals = 'goals'` to `CollectionNames`, `[CollectionNames.Goals]: Goal;` to `Collections`, `GoalRepository`/`GoalService` tokens + `Dependencies` entries in `dependencies/types.ts`; in `dependencies/index.ts` register `MongoGoalRepository`, then register `GoalService` with all four constructor args:

```typescript
dependencyContainer.registerSingleton(
    DependencyToken.GoalService,
    class {
        constructor() {
            return new GoalService(
                dependencyContainer.resolve(DependencyToken.GoalRepository),
                dependencyContainer.resolve(DependencyToken.IdGenerator),
                dependencyContainer.resolve(DependencyToken.EtsyClient),
                dependencyContainer.resolve(DependencyToken.EtsyConnectionRepository)
            );
        }
    } as any
);
```

(`EtsyClient` and `EtsyConnectionRepository` tokens already exist from the prior Etsy integration work — no new tokens needed for them.)

- [ ] **Step 12: Run full API test suite**

Run: `bun test packages/api`
Expected: PASS, no regressions.

- [ ] **Step 13: Commit**

```bash
git add packages/types/src/goal packages/types/src/index.ts packages/api/src/domain/GoalRepository packages/api/src/domain/GoalService packages/api/src/domain/EtsyClient packages/api/src/infrastructure/MongoGoalRepository packages/api/src/handlers/Goal packages/api/src/routes/index.ts packages/api/src/dependencies/types.ts packages/api/src/dependencies/index.ts
git commit -m "feat: add Goal domain with CRUD API and Etsy-sourced progress values"
```

---

### Task 3: Frontend — Board page shell, API layer, nav wiring

**Files:**
- Create: `packages/web/src/api/endpoints/tasks/index.ts`
- Create: `packages/web/src/api/endpoints/goals/index.ts`
- Modify: `packages/web/src/api/endpoints.ts` (add `TASKS_ENDPOINT`, `GOALS_ENDPOINT`)
- Create: `packages/web/src/pages/Board/index.tsx` (shell only — renders fetched tasks/goals as plain lists, no drag/drop yet)
- Modify: `packages/web/src/constants/routes.ts` (add `BOARD_PAGE`, append to `ROUTES`)
- Modify: `packages/web/src/index.tsx` (register `<Route path={BOARD_PAGE.route}>`)

**Interfaces:**
- Consumes: `Task`, `Goal` types from `@jewellery-catalogue/types` (Tasks 1 & 2); `makeRequestWithAutoRefresh` from `../../makeRequest` (existing).
- Produces: `getTasksQuery(getAccessToken, onTokenRefresh, onTokenClear)`, `makeCreateTaskRequest(data: FormTask, ...)`, `makeUpdateTaskRequest(id, updates: UpdateTask, ...)`, `makeDeleteTaskRequest(id, ...)` and the equivalent four for goals — consumed by Tasks 4, 5, 6.

- [ ] **Step 1: Add endpoint constants**

In `packages/web/src/api/endpoints.ts`, add:

```typescript
export const TASKS_ENDPOINT = '/api/tasks';
export const GOALS_ENDPOINT = '/api/goals';
```

- [ ] **Step 2: Tasks API module**

```typescript
// packages/web/src/api/endpoints/tasks/index.ts
import { type FormTask, MethodType, type Task, type UpdateTask } from '@jewellery-catalogue/types';

import { TASKS_ENDPOINT } from '../../endpoints';
import { makeRequestWithAutoRefresh } from '../../makeRequest';

type AuthArgs = [getAccessToken: () => string, onTokenRefresh: (t: string) => void, onTokenClear: () => void];

export const getTasksQuery = (...[getAccessToken, onTokenRefresh, onTokenClear]: AuthArgs) => ({
    queryKey: ['tasks'],
    queryFn: async () =>
        makeRequestWithAutoRefresh<Array<Task>>(
            { pathname: TASKS_ENDPOINT, method: MethodType.GET, operationString: 'fetch tasks', accessToken: '' },
            getAccessToken,
            onTokenRefresh,
            onTokenClear
        ),
});

export const makeCreateTaskRequest = async (data: FormTask, ...[getAccessToken, onTokenRefresh, onTokenClear]: AuthArgs) =>
    makeRequestWithAutoRefresh<Task>(
        { pathname: TASKS_ENDPOINT, method: MethodType.POST, operationString: 'create task', accessToken: '', body: data },
        getAccessToken,
        onTokenRefresh,
        onTokenClear
    );

export const makeUpdateTaskRequest = async (
    id: string,
    data: UpdateTask,
    ...[getAccessToken, onTokenRefresh, onTokenClear]: AuthArgs
) =>
    makeRequestWithAutoRefresh<Task>(
        {
            pathname: `${TASKS_ENDPOINT}/${id}`,
            method: MethodType.PUT,
            operationString: 'update task',
            accessToken: '',
            body: data,
        },
        getAccessToken,
        onTokenRefresh,
        onTokenClear
    );

export const makeDeleteTaskRequest = async (id: string, ...[getAccessToken, onTokenRefresh, onTokenClear]: AuthArgs) =>
    makeRequestWithAutoRefresh<{ message: string }>(
        { pathname: `${TASKS_ENDPOINT}/${id}`, method: MethodType.DELETE, operationString: 'delete task', accessToken: '' },
        getAccessToken,
        onTokenRefresh,
        onTokenClear
    );
```

- [ ] **Step 3: Goals API module**

Mirror Step 2 exactly, swapping `Task`→`Goal`, `FormTask`→`FormGoal`, `UpdateTask`→`UpdateGoal`, `TASKS_ENDPOINT`→`GOALS_ENDPOINT`, `'tasks'`→`'goals'`, file at `packages/web/src/api/endpoints/goals/index.ts`.

- [ ] **Step 4: Route constant + registration**

In `packages/web/src/constants/routes.ts`:

```typescript
export const BOARD_PAGE: NavRoute = {
    name: 'Board',
    route: '/board',
};
```

Add `BOARD_PAGE` to the `ROUTES` array.

In `packages/web/src/index.tsx`: import `BOARD_PAGE` and `Board` from `./pages/Board`, add:

```tsx
<Route
    path={BOARD_PAGE.route}
    element={
        <ProtectedRoute fallbackPath={START_PAGE.route}>
            <MainLayout>
                <Board />
            </MainLayout>
        </ProtectedRoute>
    }
/>
```

- [ ] **Step 5: Board page shell**

```tsx
// packages/web/src/pages/Board/index.tsx
import { useAuth } from '@imapps/web-utils';
import { useQuery } from '@tanstack/react-query';

import { getGoalsQuery } from '../../api/endpoints/goals';
import { getTasksQuery } from '../../api/endpoints/tasks';
import LoadingScreen from '../../components/Loading';

const Board: React.FC = () => {
    const { accessToken, login, logout } = useAuth();

    const { data: tasks, isLoading: tasksLoading } = useQuery(getTasksQuery(() => accessToken, login, logout));
    const { data: goals, isLoading: goalsLoading } = useQuery(getGoalsQuery(() => accessToken, login, logout));

    if (tasksLoading || goalsLoading) {
        return <LoadingScreen />;
    }

    return (
        <div className="p-6">
            <h1 className="text-2xl font-semibold mb-4">Board</h1>
            <p className="text-sm text-muted-foreground mb-2">{tasks?.length ?? 0} tasks</p>
            <ul className="mb-6">
                {tasks?.map((task) => (
                    <li key={task.id} className="text-sm py-1">
                        {task.title} — {task.status}
                    </li>
                ))}
            </ul>
            <p className="text-sm text-muted-foreground mb-2">{goals?.length ?? 0} goals</p>
            <ul>
                {goals?.map((goal) => (
                    <li key={goal.id} className="text-sm py-1">
                        {goal.title}: {goal.currentValue}/{goal.targetValue}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default Board;
```

- [ ] **Step 6: Manual verification**

Run `bun run start:web` and `bun run start:api` (or `bun run start`), log in, navigate to `/board`. Expected: page loads with "0 tasks" / "0 goals" (no data yet — that's expected, CRUD UI lands in Tasks 5/6).

- [ ] **Step 7: Commit**

```bash
git add packages/web/src/api/endpoints/tasks packages/web/src/api/endpoints/goals packages/web/src/api/endpoints.ts packages/web/src/pages/Board packages/web/src/constants/routes.ts packages/web/src/index.tsx
git commit -m "feat: add Board page shell with tasks/goals data layer"
```

---

### Task 4: Frontend — Kanban columns with drag-and-drop

**Files:**
- Modify: `packages/web/package.json` (add `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`)
- Create: `packages/web/src/components/TaskBoard/index.tsx` (3-column DndContext + droppable columns)
- Create: `packages/web/src/components/TaskBoard/TaskCard.tsx` (draggable card: title, subject badge, importance badge, due date)
- Modify: `packages/web/src/pages/Board/index.tsx` (replace the plain task `<ul>` with `<TaskBoard>`)

**Interfaces:**
- Consumes: `Task` type (Task 1), `makeUpdateTaskRequest` (Task 3).
- Produces: `<TaskBoard tasks={Task[]} onStatusChange={(taskId, status: TaskStatus) => void} />` — consumed by Task 6 if it needs to trigger a refetch after a goal-linked task moves to Done.

- [ ] **Step 1: Add drag-and-drop dependency**

Run (from repo root, using Bun per this repo's package manager):
```bash
bun add --filter @jewellery-catalogue/web @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

- [ ] **Step 2: Build `TaskCard`**

```tsx
// packages/web/src/components/TaskBoard/TaskCard.tsx
import { useDraggable } from '@dnd-kit/core';
import type { Task } from '@jewellery-catalogue/types';

import { Badge } from '@/components/ui/badge';

const IMPORTANCE_VARIANT: Record<Task['importance'], 'default' | 'secondary' | 'destructive'> = {
    low: 'secondary',
    medium: 'default',
    high: 'destructive',
};

const TaskCard: React.FC<{ task: Task }> = ({ task }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });

    const style = transform
        ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, opacity: isDragging ? 0.5 : 1 }
        : undefined;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className="rounded-md border bg-card p-3 mb-2 cursor-grab active:cursor-grabbing"
        >
            <p className="text-sm font-medium mb-1">{task.title}</p>
            <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs capitalize">
                    {task.subject}
                </Badge>
                <Badge variant={IMPORTANCE_VARIANT[task.importance]} className="text-xs capitalize">
                    {task.importance}
                </Badge>
                {task.dueDate && (
                    <span className="text-xs text-muted-foreground">
                        {new Date(task.dueDate).toLocaleDateString()}
                    </span>
                )}
            </div>
        </div>
    );
};

export default TaskCard;
```

- [ ] **Step 3: Build `TaskBoard`**

```tsx
// packages/web/src/components/TaskBoard/index.tsx
import { DndContext, type DragEndEvent, useDroppable } from '@dnd-kit/core';
import type { Task, TaskStatus } from '@jewellery-catalogue/types';

import TaskCard from './TaskCard';

const COLUMNS: Array<{ status: TaskStatus; label: string }> = [
    { status: 'todo', label: 'To Do' },
    { status: 'in_progress', label: 'In Progress' },
    { status: 'done', label: 'Done' },
];

const Column: React.FC<{ status: TaskStatus; label: string; tasks: Array<Task> }> = ({ status, label, tasks }) => {
    const { setNodeRef, isOver } = useDroppable({ id: status });

    return (
        <div
            ref={setNodeRef}
            className={`flex-1 min-w-[240px] rounded-md border bg-muted/30 p-3 ${isOver ? 'ring-2 ring-primary' : ''}`}
        >
            <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold">{label}</span>
                <span className="text-xs text-muted-foreground">{tasks.length}</span>
            </div>
            {tasks.map((task) => (
                <TaskCard key={task.id} task={task} />
            ))}
        </div>
    );
};

const TaskBoard: React.FC<{ tasks: Array<Task>; onStatusChange: (taskId: string, status: TaskStatus) => void }> = ({
    tasks,
    onStatusChange,
}) => {
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) return;

        const newStatus = over.id as TaskStatus;
        const task = tasks.find((t) => t.id === active.id);

        if (task && task.status !== newStatus) {
            onStatusChange(task.id, newStatus);
        }
    };

    return (
        <DndContext onDragEnd={handleDragEnd}>
            <div className="flex gap-4">
                {COLUMNS.map((col) => (
                    <Column
                        key={col.status}
                        status={col.status}
                        label={col.label}
                        tasks={tasks.filter((t) => t.status === col.status)}
                    />
                ))}
            </div>
        </DndContext>
    );
};

export default TaskBoard;
```

- [ ] **Step 4: Wire into `Board` page**

In `packages/web/src/pages/Board/index.tsx`, replace the plain task list with:

```tsx
import { useQueryClient } from '@tanstack/react-query';
import type { TaskStatus } from '@jewellery-catalogue/types';

import TaskBoard from '../../components/TaskBoard';
import { makeUpdateTaskRequest } from '../../api/endpoints/tasks';

// inside Board component, alongside existing hooks:
const queryClient = useQueryClient();

const handleStatusChange = async (taskId: string, status: TaskStatus) => {
    await makeUpdateTaskRequest(taskId, { status }, () => accessToken, login, logout);
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
};

// replace the task <ul> with:
<TaskBoard tasks={tasks ?? []} onStatusChange={handleStatusChange} />
```

- [ ] **Step 5: Manual verification**

Run `bun run start`, create a task directly via `curl -X POST localhost:<api-port>/api/tasks -H "Authorization: Bearer <token>" -d '{"title":"Test","subject":"product","importance":"low","recurrence":"none"}'`, reload `/board`, confirm the card renders in "To Do" and dragging it to "In Progress"/"Done" persists (reload the page and the card stays in the new column).

- [ ] **Step 6: Commit**

```bash
git add packages/web/package.json packages/web/src/components/TaskBoard packages/web/src/pages/Board/index.tsx
git commit -m "feat: add drag-and-drop kanban columns to Board page"
```

---

### Task 5: Frontend — Add/Edit Task dialog

**Files:**
- Create: `packages/web/src/components/TaskBoard/AddTaskDialog.tsx`
- Modify: `packages/web/src/pages/Board/index.tsx` (render dialog + trigger button, invalidate `['tasks']` on success)

**Interfaces:**
- Consumes: `FormTask`, `taskSubjectEnum`, `taskImportanceEnum`, `taskRecurrenceEnum` (Task 1); `makeCreateTaskRequest` (Task 3); existing shadcn `Dialog`, `Select`, `Input`, `Button`, `Popover`+`Calendar` (date picker) components under `packages/web/src/components/ui/` — confirm exact filenames with `ls packages/web/src/components/ui/` before importing (this repo uses shadcn's generated names, e.g. `dialog.tsx`, `select.tsx`, `calendar.tsx`, `popover.tsx`; if `calendar.tsx`/`popover.tsx` don't exist yet, run `bunx shadcn@latest add calendar popover` from `packages/web` first, matching how this repo's other `ui/` components were generated).
- Produces: `<AddTaskDialog open onOpenChange onCreated={() => void} />`.

- [ ] **Step 1: Confirm available shadcn primitives**

Run: `ls packages/web/src/components/ui/`
If `dialog.tsx`, `select.tsx`, `calendar.tsx`, or `popover.tsx` are missing, generate them: `cd packages/web && bunx shadcn@latest add dialog select calendar popover`.

- [ ] **Step 2: Build the dialog**

```tsx
// packages/web/src/components/TaskBoard/AddTaskDialog.tsx
import { useAuth } from '@imapps/web-utils';
import { taskImportanceEnum, taskRecurrenceEnum, taskSubjectEnum } from '@jewellery-catalogue/types';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { makeCreateTaskRequest } from '../../api/endpoints/tasks';

const AddTaskDialog: React.FC<{ open: boolean; onOpenChange: (open: boolean) => void; onCreated: () => void }> = ({
    open,
    onOpenChange,
    onCreated,
}) => {
    const { accessToken, login, logout } = useAuth();
    const [title, setTitle] = useState('');
    const [subject, setSubject] = useState<(typeof taskSubjectEnum.options)[number]>('product');
    const [importance, setImportance] = useState<(typeof taskImportanceEnum.options)[number]>('medium');
    const [recurrence, setRecurrence] = useState<(typeof taskRecurrenceEnum.options)[number]>('none');
    const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
    const [submitting, setSubmitting] = useState(false);

    const reset = () => {
        setTitle('');
        setSubject('product');
        setImportance('medium');
        setRecurrence('none');
        setDueDate(undefined);
    };

    const handleSubmit = async () => {
        if (!title.trim()) return;

        setSubmitting(true);
        try {
            await makeCreateTaskRequest(
                { title: title.trim(), subject, importance, recurrence, dueDate },
                () => accessToken,
                login,
                logout
            );
            reset();
            onOpenChange(false);
            onCreated();
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add Task</DialogTitle>
                </DialogHeader>

                <div className="space-y-3">
                    <Input placeholder="Task title" value={title} onChange={(e) => setTitle(e.target.value)} />

                    <Select value={subject} onValueChange={(v) => setSubject(v as typeof subject)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Subject" />
                        </SelectTrigger>
                        <SelectContent>
                            {taskSubjectEnum.options.map((opt) => (
                                <SelectItem key={opt} value={opt} className="capitalize">
                                    {opt}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={importance} onValueChange={(v) => setImportance(v as typeof importance)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Importance" />
                        </SelectTrigger>
                        <SelectContent>
                            {taskImportanceEnum.options.map((opt) => (
                                <SelectItem key={opt} value={opt} className="capitalize">
                                    {opt}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={recurrence} onValueChange={(v) => setRecurrence(v as typeof recurrence)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Recurring" />
                        </SelectTrigger>
                        <SelectContent>
                            {taskRecurrenceEnum.options.map((opt) => (
                                <SelectItem key={opt} value={opt} className="capitalize">
                                    {opt}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start font-normal">
                                {dueDate ? dueDate.toLocaleDateString() : 'Due date (optional)'}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" selected={dueDate} onSelect={setDueDate} />
                        </PopoverContent>
                    </Popover>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={submitting || !title.trim()}>
                        Add Task
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default AddTaskDialog;
```

- [ ] **Step 3: Wire the trigger into `Board`**

In `packages/web/src/pages/Board/index.tsx`, add an `Add Task` button that opens `AddTaskDialog`, and on `onCreated` call `queryClient.invalidateQueries({ queryKey: ['tasks'] })`.

- [ ] **Step 4: Manual verification**

`bun run start`, open `/board`, click "Add Task", fill in title/subject/importance/recurrence/due date, submit. Expected: dialog closes, new card appears in "To Do" without a page reload.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/components/TaskBoard/AddTaskDialog.tsx packages/web/src/pages/Board/index.tsx
git commit -m "feat: add task creation dialog to Board page"
```

---

### Task 6: Frontend — Goal progress widgets, with an Etsy-sourced "Track from" dropdown

**Files:**
- Create: `packages/web/src/components/GoalProgress/index.tsx` (progress bar card: title + "current/target" + a sync button when Etsy-sourced)
- Create: `packages/web/src/components/GoalProgress/AddGoalDialog.tsx`
- Modify: `packages/web/src/api/endpoints/goals/index.ts` (add `makeSyncGoalEtsyValueRequest`, mirroring Task 3's other goal endpoints)
- Modify: `packages/web/src/pages/Board/index.tsx` (render a goals row above the columns, replacing the plain goals `<ul>`)

**Interfaces:**
- Consumes: `Goal`, `FormGoal`, `goalSourceEnum` (Task 2); `getGoalsQuery`, `makeCreateGoalRequest` (Task 3's mirrored goals module); existing shadcn `Progress` and `Select` components (check `packages/web/src/components/ui/progress.tsx` exists — `select.tsx` already exists, confirmed in Task 5).
- Produces: `<GoalProgress goal={Goal} onSynced={() => void} />`, `<AddGoalDialog open onOpenChange onCreated />`.

- [ ] **Step 1: Confirm `Progress` primitive exists**

Run: `ls packages/web/src/components/ui/progress.tsx`
If missing: `cd packages/web && bunx shadcn@latest add progress`.

- [ ] **Step 2: Add the sync endpoint call**

In `packages/web/src/api/endpoints/goals/index.ts` (created in Task 3), add:

```typescript
export const makeSyncGoalEtsyValueRequest = async (
    id: string,
    ...[getAccessToken, onTokenRefresh, onTokenClear]: AuthArgs
) =>
    makeRequestWithAutoRefresh<Goal>(
        {
            pathname: `${GOALS_ENDPOINT}/${id}/etsy-sync`,
            method: MethodType.POST,
            operationString: 'sync goal from Etsy',
            accessToken: '',
        },
        getAccessToken,
        onTokenRefresh,
        onTokenClear
    );
```

- [ ] **Step 3: Build `GoalProgress`**

```tsx
// packages/web/src/components/GoalProgress/index.tsx
import { useAuth } from '@imapps/web-utils';
import type { Goal } from '@jewellery-catalogue/types';
import { RefreshCw } from 'lucide-react';
import { useState } from 'react';

import { Progress } from '@/components/ui/progress';

import { makeSyncGoalEtsyValueRequest } from '../../api/endpoints/goals';

const SOURCE_LABEL: Record<Goal['source'], string | null> = {
    manual: null,
    etsy_active_listings: 'Etsy · Active listings',
    etsy_sales_count: 'Etsy · Total sales',
};

const GoalProgress: React.FC<{ goal: Goal; onSynced: () => void }> = ({ goal, onSynced }) => {
    const { accessToken, login, logout } = useAuth();
    const [syncing, setSyncing] = useState(false);
    const percent = goal.targetValue > 0 ? Math.min(100, (goal.currentValue / goal.targetValue) * 100) : 0;
    const sourceLabel = SOURCE_LABEL[goal.source];

    const handleSync = async () => {
        setSyncing(true);
        try {
            await makeSyncGoalEtsyValueRequest(goal.id, () => accessToken, login, logout);
            onSynced();
        } finally {
            setSyncing(false);
        }
    };

    return (
        <div className="rounded-md border bg-card p-3 min-w-[200px]">
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{goal.title}</span>
                <span className="text-xs text-muted-foreground">
                    {goal.currentValue}/{goal.targetValue}
                    {goal.unit ? ` ${goal.unit}` : ''}
                </span>
            </div>
            <Progress value={percent} />
            {sourceLabel && (
                <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">{sourceLabel}</span>
                    <button
                        type="button"
                        onClick={handleSync}
                        disabled={syncing}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-50"
                        aria-label="Sync from Etsy"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default GoalProgress;
```

- [ ] **Step 4: Build `AddGoalDialog` with the "Track from" dropdown**

Structurally mirrors `AddTaskDialog` (Task 5): a `title` `Input`, a `targetValue` number `Input`, an optional `unit` `Input`, and a `source` `Select` — this is the "dropdown of what the goal values are available" the user asked for, listing the three `goalSourceEnum` options with human labels:

```tsx
// packages/web/src/components/GoalProgress/AddGoalDialog.tsx
import { useAuth } from '@imapps/web-utils';
import { goalSourceEnum, type GoalSource } from '@jewellery-catalogue/types';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { makeCreateGoalRequest } from '../../api/endpoints/goals';

const SOURCE_LABEL: Record<GoalSource, string> = {
    manual: 'Manual entry',
    etsy_active_listings: 'Etsy — Active listings',
    etsy_sales_count: 'Etsy — Total sales',
};

const AddGoalDialog: React.FC<{ open: boolean; onOpenChange: (open: boolean) => void; onCreated: () => void }> = ({
    open,
    onOpenChange,
    onCreated,
}) => {
    const { accessToken, login, logout } = useAuth();
    const [title, setTitle] = useState('');
    const [targetValue, setTargetValue] = useState('');
    const [unit, setUnit] = useState('');
    const [source, setSource] = useState<GoalSource>('manual');
    const [submitting, setSubmitting] = useState(false);

    const reset = () => {
        setTitle('');
        setTargetValue('');
        setUnit('');
        setSource('manual');
    };

    const handleSubmit = async () => {
        const target = Number(targetValue);
        if (!title.trim() || !target || target <= 0) return;

        setSubmitting(true);
        try {
            await makeCreateGoalRequest(
                { title: title.trim(), targetValue: target, unit: unit.trim() || undefined, source },
                () => accessToken,
                login,
                logout
            );
            reset();
            onOpenChange(false);
            onCreated();
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add Goal</DialogTitle>
                </DialogHeader>

                <div className="space-y-3">
                    <Input placeholder="Goal title" value={title} onChange={(e) => setTitle(e.target.value)} />
                    <Input
                        type="number"
                        placeholder="Target (e.g. 50)"
                        value={targetValue}
                        onChange={(e) => setTargetValue(e.target.value)}
                    />
                    <Input placeholder="Unit (optional, e.g. listings)" value={unit} onChange={(e) => setUnit(e.target.value)} />

                    <Select value={source} onValueChange={(v) => setSource(v as GoalSource)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Track from" />
                        </SelectTrigger>
                        <SelectContent>
                            {goalSourceEnum.options.map((opt) => (
                                <SelectItem key={opt} value={opt}>
                                    {SOURCE_LABEL[opt]}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={submitting || !title.trim() || !targetValue}>
                        Add Goal
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default AddGoalDialog;
```

For `source !== 'manual'`, `currentValue` is never sent from the client — `GoalService.addGoal` (Task 2) overwrites it with a live Etsy fetch regardless of what's posted, so there's no manual "current value" field to show or hide here.

- [ ] **Step 5: Wire into `Board`**

In `packages/web/src/pages/Board/index.tsx`, replace the plain goals `<ul>` with a horizontal-scroll row of `<GoalProgress goal={g} onSynced={() => queryClient.invalidateQueries({ queryKey: ['goals'] })} />` per goal, plus an "Add Goal" button opening `AddGoalDialog`, invalidating `['goals']` on `onCreated` too.

- [ ] **Step 6: Manual verification**

`bun run start`, open `/board`, click "Add Goal". Expected: the "Track from" dropdown shows "Manual entry", "Etsy — Active listings", "Etsy — Total sales". Create one with "Manual entry" and target 50 — card shows "0/50". Create a second with "Etsy — Active listings" (requires an Etsy connection already set up per the existing Etsy integration) — card should show the shop's real active listing count immediately, with an "Etsy · Active listings" label and a refresh icon; click the refresh icon and confirm it re-fetches without erroring.

- [ ] **Step 7: Commit**

```bash
git add packages/web/src/components/GoalProgress packages/web/src/pages/Board/index.tsx packages/web/src/api/endpoints/goals
git commit -m "feat: add goal progress widgets with Etsy-sourced tracking"
```

---

### Task 7: Backend — Recurring task regeneration

**Files:**
- Modify: `packages/api/src/domain/TaskService/index.ts` (add regeneration logic inside `updateTask`)
- Modify: `packages/api/src/domain/TaskService/index.test.ts` (add regeneration test cases)

**Interfaces:**
- Consumes: `Task.recurrence`, `Task.dueDate` (Task 1); `IdGenerator` (existing).
- Produces: no new public method — `updateTask` transparently inserts a new `Task` when a recurring task transitions into `status: 'done'`. Callers (handler, frontend `TaskBoard.onStatusChange`) need no changes.

- [ ] **Step 1: Write failing tests for regeneration**

Add to `packages/api/src/domain/TaskService/index.test.ts`:

```typescript
it('marking a non-recurring task done does not create a new task', async () => {
    const existing: Task = {
        id: 'task-1',
        userId: 'user-1',
        title: 'One-off task',
        subject: 'marketing',
        importance: 'low',
        recurrence: 'none',
        status: 'todo',
        createdAt: new Date('2026-08-01T00:00:00.000Z'),
        updatedAt: new Date('2026-08-01T00:00:00.000Z'),
    };
    (mockTaskRepo.getByIdAndUserId as ReturnType<typeof mock>).mockResolvedValue(existing);

    await service.updateTask('task-1', { status: 'done' }, 'user-1');

    expect(mockTaskRepo.insert).not.toHaveBeenCalled();
});

it('marking a daily recurring task done creates the next occurrence due +1 day', async () => {
    const existing: Task = {
        id: 'task-1',
        userId: 'user-1',
        title: 'Post daily update',
        subject: 'marketing',
        importance: 'low',
        recurrence: 'daily',
        status: 'todo',
        dueDate: new Date('2026-08-10T00:00:00.000Z'),
        createdAt: new Date('2026-08-01T00:00:00.000Z'),
        updatedAt: new Date('2026-08-01T00:00:00.000Z'),
    };
    (mockTaskRepo.getByIdAndUserId as ReturnType<typeof mock>).mockResolvedValue(existing);
    (mockIdGenerator.generate as ReturnType<typeof mock>).mockReturnValue('task-2');

    await service.updateTask('task-1', { status: 'done' }, 'user-1');

    expect(mockTaskRepo.insert).toHaveBeenCalledWith(
        expect.objectContaining({
            id: 'task-2',
            title: 'Post daily update',
            status: 'todo',
            dueDate: new Date('2026-08-11T00:00:00.000Z'),
        })
    );
});

it('marking a weekly recurring task done creates the next occurrence due +7 days', async () => {
    const existing: Task = {
        id: 'task-1',
        userId: 'user-1',
        title: 'Review shop analytics',
        subject: 'finance',
        importance: 'medium',
        recurrence: 'weekly',
        status: 'in_progress',
        dueDate: new Date('2026-08-10T00:00:00.000Z'),
        createdAt: new Date('2026-08-01T00:00:00.000Z'),
        updatedAt: new Date('2026-08-01T00:00:00.000Z'),
    };
    (mockTaskRepo.getByIdAndUserId as ReturnType<typeof mock>).mockResolvedValue(existing);
    (mockIdGenerator.generate as ReturnType<typeof mock>).mockReturnValue('task-2');

    await service.updateTask('task-1', { status: 'done' }, 'user-1');

    expect(mockTaskRepo.insert).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'task-2', dueDate: new Date('2026-08-17T00:00:00.000Z') })
    );
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `bun test packages/api/src/domain/TaskService/index.test.ts`
Expected: the 3 new tests FAIL (current `updateTask` never calls `insert`).

- [ ] **Step 3: Implement regeneration in `updateTask`**

```typescript
// packages/api/src/domain/TaskService/index.ts — replace the updateTask method
async updateTask(id: string, updates: UpdateTask, userId: string): Promise<Task> {
    if (!userId) {
        throw Object.assign(new Error('User ID is required'), { status: 400 });
    }

    const existing = await this.taskRepo.getByIdAndUserId(id, userId);

    if (!existing) {
        throw Object.assign(new Error('Task not found'), { status: 404 });
    }

    const updated: Task = { ...existing, ...updates, updatedAt: new Date() };

    await this.taskRepo.update(id, updated);

    if (existing.status !== 'done' && updated.status === 'done' && updated.recurrence !== 'none') {
        await this.taskRepo.insert(this.buildNextOccurrence(updated));
    }

    return updated;
}

private buildNextOccurrence(completed: Task): Task {
    const offsetDays = completed.recurrence === 'daily' ? 1 : 7;
    const baseDate = completed.dueDate ?? new Date();
    const nextDueDate = new Date(baseDate);
    nextDueDate.setDate(nextDueDate.getDate() + offsetDays);

    const now = new Date();
    return {
        ...completed,
        id: this.idGenerator.generate(),
        status: 'todo',
        dueDate: nextDueDate,
        createdAt: now,
        updatedAt: now,
    };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test packages/api/src/domain/TaskService/index.test.ts`
Expected: PASS (all 9 cases — 6 from Task 1 + 3 new).

- [ ] **Step 5: Run full API test suite**

Run: `bun test packages/api`
Expected: PASS, no regressions.

- [ ] **Step 6: Manual verification**

`bun run start`, on `/board` create a task with recurrence "Daily" and a due date, drag it to "Done". Expected: a new card for the same title appears in "To Do" with the due date shifted +1 day (reload `/board` and confirm via the `curl GET /api/tasks` response if the UI doesn't auto-refresh the new card).

- [ ] **Step 7: Commit**

```bash
git add packages/api/src/domain/TaskService/index.ts packages/api/src/domain/TaskService/index.test.ts
git commit -m "feat: auto-regenerate recurring tasks when marked done"
```

---

### Task 8: Frontend — Filter tasks by subject and importance

**Files:**
- Create: `packages/web/src/components/TaskBoard/TaskFilters.tsx`
- Modify: `packages/web/src/pages/Board/index.tsx` (hold filter state, filter `tasks` before passing to `<TaskBoard>`)

**Interfaces:**
- Consumes: `Task`, `taskSubjectEnum`, `taskImportanceEnum` (Task 1); `<TaskBoard>` (Task 4, unchanged — it still just renders whatever `tasks` array it's given, so filtering stays a pure pre-filter step in `Board`).
- Produces: `<TaskFilters tasks={Task[]} subjectFilter importanceFilter onSubjectFilterChange onImportanceFilterChange />` — local to this task, not consumed elsewhere.

Filtering is client-side over the already-fetched `tasks` array — no new API params, no backend change. Subject is single-select (mirrors the `Tabs`/`TabsList`/`TabsTrigger` filter already used for `DesignType` on the Designs page, `packages/web/src/pages/Designs/index.tsx:175-184`); importance is multi-select toggle chips, since "show me High and Medium" is a real use case a single-select can't express.

- [ ] **Step 1: Confirm the `Tabs` primitive is available**

It already is (`packages/web/src/components/ui/tabs.tsx` exists — used by the Designs page). No shadcn generation needed for this task.

- [ ] **Step 2: Build `TaskFilters`**

```tsx
// packages/web/src/components/TaskBoard/TaskFilters.tsx
import { taskImportanceEnum, taskSubjectEnum, type Task, type TaskImportance, type TaskSubject } from '@jewellery-catalogue/types';

import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const IMPORTANCE_VARIANT: Record<TaskImportance, 'default' | 'secondary' | 'destructive'> = {
    low: 'secondary',
    medium: 'default',
    high: 'destructive',
};

const TaskFilters: React.FC<{
    tasks: Array<Task>;
    subjectFilter: TaskSubject | 'all';
    importanceFilter: Set<TaskImportance>;
    onSubjectFilterChange: (subject: TaskSubject | 'all') => void;
    onImportanceFilterChange: (importance: TaskImportance) => void;
}> = ({ tasks, subjectFilter, importanceFilter, onSubjectFilterChange, onImportanceFilterChange }) => {
    return (
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <Tabs value={subjectFilter} onValueChange={(v) => onSubjectFilterChange(v as TaskSubject | 'all')}>
                <TabsList>
                    <TabsTrigger value="all">All ({tasks.length})</TabsTrigger>
                    {taskSubjectEnum.options.map((subject) => (
                        <TabsTrigger key={subject} value={subject} className="capitalize">
                            {subject} ({tasks.filter((t) => t.subject === subject).length})
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>

            <div className="flex items-center gap-2">
                {taskImportanceEnum.options.map((importance) => {
                    const active = importanceFilter.has(importance);
                    return (
                        <Badge
                            key={importance}
                            variant={active ? IMPORTANCE_VARIANT[importance] : 'outline'}
                            className="capitalize cursor-pointer select-none"
                            onClick={() => onImportanceFilterChange(importance)}
                        >
                            {importance}
                        </Badge>
                    );
                })}
            </div>
        </div>
    );
};

export default TaskFilters;
```

An empty `importanceFilter` set means "no importance filter applied" (show all) — matches the "All" default for subject, and means neither filter needs an extra explicit "clear" control.

- [ ] **Step 3: Wire filter state into `Board` and filter before rendering**

In `packages/web/src/pages/Board/index.tsx`:

```tsx
import { useMemo, useState } from 'react';
import type { TaskImportance, TaskSubject } from '@jewellery-catalogue/types';

import TaskFilters from '../../components/TaskBoard/TaskFilters';

// inside Board component, alongside existing hooks:
const [subjectFilter, setSubjectFilter] = useState<TaskSubject | 'all'>('all');
const [importanceFilter, setImportanceFilter] = useState<Set<TaskImportance>>(new Set());

const toggleImportanceFilter = (importance: TaskImportance) => {
    setImportanceFilter((prev) => {
        const next = new Set(prev);
        if (next.has(importance)) {
            next.delete(importance);
        } else {
            next.add(importance);
        }
        return next;
    });
};

const filteredTasks = useMemo(() => {
    return (tasks ?? []).filter((task) => {
        if (subjectFilter !== 'all' && task.subject !== subjectFilter) return false;
        if (importanceFilter.size > 0 && !importanceFilter.has(task.importance)) return false;
        return true;
    });
}, [tasks, subjectFilter, importanceFilter]);

// render, above <TaskBoard>:
<TaskFilters
    tasks={tasks ?? []}
    subjectFilter={subjectFilter}
    importanceFilter={importanceFilter}
    onSubjectFilterChange={setSubjectFilter}
    onImportanceFilterChange={toggleImportanceFilter}
/>
<TaskBoard tasks={filteredTasks} onStatusChange={handleStatusChange} />
```

Per-subject and per-importance counts in `TaskFilters` are computed from the full `tasks` array (not `filteredTasks`) so the tab/chip counts don't change as filters are applied — only the board's contents do.

- [ ] **Step 4: Manual verification**

`bun run start`, open `/board` with the 5 sample tasks from Task 4's verification. Click the "Product" tab: only the 2 product tasks show, across whichever columns they're in. Click it back to "All", then click the "High" importance chip: only high-importance tasks show. Click "High" again to toggle it off: all tasks return.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/components/TaskBoard/TaskFilters.tsx packages/web/src/pages/Board/index.tsx
git commit -m "feat: filter Board tasks by subject and importance"
```

---

## Self-Review Notes

- **Spec coverage:** 3 columns → Task 4. Add-task fields (due date, subject, importance, recurring) → Task 1 (backend schema) + Task 5 (dialog). Goal progress "20/50" → Task 2 (backend) + Task 6 (widget). Etsy-sourced goal values + "Track from" dropdown → Task 2 (`GoalService.fetchEtsyValue`/`syncFromEtsy`, extended `EtsyClient.getShop`) + Task 6 (`AddGoalDialog`'s `Select`, `GoalProgress`'s sync button). Subject/importance filtering → Task 8. Recurring daily/weekly regeneration → Task 7. Nav/routing → Task 3.
- **Type consistency:** `TaskStatus`/`TaskSubject`/`TaskImportance`/`TaskRecurrence` defined once in Task 1 and reused verbatim in Tasks 3–8 (no renamed duplicates). `GoalSource` defined once in Task 2 and reused verbatim in Task 6. `GoalRepository`/`GoalService` in Task 2 intentionally mirror `TaskRepository`/`TaskService` method names 1:1 for consistency, diverging only where Etsy-sourcing requires it (`syncFromEtsy`, the extra two constructor dependencies).
- **Deferred out of scope (call out to user, not silently dropped):** editing/deleting existing tasks and goals from the UI (only create + drag-status-change are covered — add as a follow-up task if wanted), the "monthly progress %" / "tasks by priority" / "tasks by category" summary tiles from the reference screenshot (explicitly cut per user's "cut it down" ask), linking a task to a goal to auto-increment `currentValue` (schema has an optional `goalId` on `Task` for this, but no auto-increment logic is implemented), any background/periodic re-sync of Etsy-sourced goals (Task 2/6 only sync on goal creation and on an explicit manual refresh click — no cron/polling), and Task 8's filters are session-only UI state (not persisted, reset on reload).
