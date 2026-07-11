import { describe, expect, it } from "vitest";
import { recipes } from "@/recipes/registry";

describe("recipes", () => {
  it("ships five valid recipes", () => {
    expect(recipes).toHaveLength(5);
    for (const recipe of recipes) {
      expect(() => recipe.inputSchema.parse(recipe.sampleInput)).not.toThrow();
      expect(recipe.estimateCost(recipe.sampleInput as Record<string, unknown>).tokens).toBeGreaterThan(0);
    }
  });
});
