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
