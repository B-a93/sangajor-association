import type { AssistantReply } from '../types/assistant';

export function normalizeAssistantReply(value: unknown): AssistantReply;
export function readAssistantError(response: Response | undefined): Promise<{ error?: string; details?: string } | null>;
