export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMUsage {
  promptTokens: number;
  completionTokens: number;
  model: string;
}

export interface LLMResponse {
  text: string;
  usage: LLMUsage;
}

export interface LLMProvider {
  id: string;
  generate(messages: LLMMessage[], options?: { schemaName?: string; temperature?: number }): Promise<LLMResponse>;
}
