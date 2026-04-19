/**
 * AI Chat API client with Server-Sent Events (SSE) streaming support.
 */

import type { ChatRequest, ChatStreamEvent, ConfirmActionRequest } from '@/types/chat';

const API_BASE = 'http://localhost:8000/api/v1';

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

/**
 * Send a chat message and receive streaming responses via SSE.
 */
export async function sendChatMessage(
  request: ChatRequest,
  onEvent: (event: ChatStreamEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  const response = await fetch(`${API_BASE}/chat/message`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(request),
    signal,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Chat API Error: ${response.status} - ${error}`);
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) {
    throw new Error('No response body');
  }

  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('data: ')) {
        try {
          const data = JSON.parse(trimmed.slice(6)) as ChatStreamEvent;
          onEvent(data);
        } catch (e) {
          console.error('[AI Chat] Parse error:', e);
        }
      }
    }
  }

  // Process any remaining buffer
  if (buffer.trim().startsWith('data: ')) {
    try {
      const data = JSON.parse(buffer.trim().slice(6)) as ChatStreamEvent;
      onEvent(data);
    } catch {
      // Ignore incomplete final chunk
    }
  }
}

/**
 * Confirm or reject a pending AI action.
 */
export async function confirmAction(request: ConfirmActionRequest): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}/chat/confirm`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error('Failed to confirm action');
  }

  return response.json();
}

/**
 * Undo the last AI action for a whiteboard.
 */
export async function undoLastAction(whiteboardId: string): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}/chat/undo`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ whiteboard_id: whiteboardId }),
  });

  if (!response.ok) {
    throw new Error('Failed to undo action');
  }

  return response.json();
}
