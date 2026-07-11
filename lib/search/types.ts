export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface SearchProvider {
  id: string;
  search(query: string): Promise<SearchResult[]>;
}
