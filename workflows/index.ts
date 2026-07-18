import { recipes } from "@/recipes/registry";
import { runRecipeJob } from "./runRecipe";

export const workflowTasks = recipes.map((recipe) => ({
  id: `run-${recipe.id}`,
  recipeId: recipe.id,
  run: runRecipeJob,
}));
