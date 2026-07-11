import { MockSearchProvider } from "./mock";
import type { SearchProvider } from "./types";

export function getSearchProvider(): SearchProvider {
  return new MockSearchProvider();
}
