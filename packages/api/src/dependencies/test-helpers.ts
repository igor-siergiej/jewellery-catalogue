// Test helper: clears the singleton state of DependencyContainer so each
// test starts fresh. Uses `as unknown as` because `instances` and
// `constructors` are private (the public API only exposes register/
// resolve); resetting through a typed cast is a deliberate test seam
// that matches the existing dependencies/index.test.ts pattern.
import { dependencyContainer } from './index';

type InternalContainer = {
    instances: Record<string, unknown>;
    constructors: Record<string, unknown>;
};

export const resetContainer = (): void => {
    const internal = dependencyContainer as unknown as InternalContainer;
    internal.instances = {};
    internal.constructors = {};
};
