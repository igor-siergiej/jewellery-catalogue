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
