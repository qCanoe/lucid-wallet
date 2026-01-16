import { ToolDefinition } from "./types/tool.js";

export class ToolRegistry {
  private tools = new Map<string, ToolDefinition<unknown, unknown>>();

  register<TInput, TOutput>(tool: ToolDefinition<TInput, TOutput>): void {
    this.tools.set(tool.name, tool as ToolDefinition<unknown, unknown>);
  }

  get<TInput, TOutput>(name: string): ToolDefinition<TInput, TOutput> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }
    return tool as ToolDefinition<TInput, TOutput>;
  }

  list(): string[] {
    return Array.from(this.tools.keys());
  }
}
