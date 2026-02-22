// Plan limits definitions for Free, Pro, and Team tiers
export const PLAN_LIMITS = {
  free: {
    nodes: 100,
    projects: 1,
    api_calls: 500,
  },
  pro: {
    nodes: 10000,
    projects: 20,
    api_calls: 50000,
  },
  team: {
    nodes: Infinity,
    projects: Infinity,
    api_calls: Infinity,
  },
} as const;

export type PlanType = keyof typeof PLAN_LIMITS;
