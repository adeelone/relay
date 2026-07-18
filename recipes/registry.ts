import { codeReviewRecipe } from "./code-review";
import { inboxTriageRecipe } from "./inbox-triage";
import { meetingNotesRecipe } from "./meeting-notes";
import { researchDigestRecipe } from "./research-digest";
import { taskPlannerRecipe } from "./task-planner";
import type { AnyRecipe } from "./types";

export const recipes: AnyRecipe[] = [
  taskPlannerRecipe,
  meetingNotesRecipe,
  researchDigestRecipe,
  codeReviewRecipe,
  inboxTriageRecipe,
];

export function getRecipe(recipeId: string): AnyRecipe {
  const recipe = recipes.find((item) => item.id === recipeId);
  if (!recipe) throw new Error(`Unknown recipe: ${recipeId}`);
  return recipe;
}
