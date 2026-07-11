import type { SearchProvider, SearchResult } from "./types";

export class MockSearchProvider implements SearchProvider {
  id = "mock-search";

  async search(query: string): Promise<SearchResult[]> {
    return [
      {
        title: `Background for ${query}`,
        url: "https://example.com/background",
        snippet: "Mock source used in local tests and development."
      },
      {
        title: `Recent context for ${query}`,
        url: "https://example.com/context",
        snippet: "Second mock result for citation preservation."
      }
    ];
  }
}
