import { Injectable } from '@nestjs/common';

const TYPING_TTL_MS = 5000;

/**
 * Ephemeral, in-memory "is typing" signal — deliberately not persisted.
 * A single process is enough for this app's scale; entries self-expire via TTL
 * so a client that stops pinging (closed tab, lost connection) clears naturally.
 */
@Injectable()
export class TypingService {
  private typing = new Map<string, number>();

  private key(fromUserId: string, toUserId: string) {
    return `${fromUserId}:${toUserId}`;
  }

  setTyping(fromUserId: string, toUserId: string, isTyping: boolean) {
    const key = this.key(fromUserId, toUserId);
    if (isTyping) {
      this.typing.set(key, Date.now() + TYPING_TTL_MS);
    } else {
      this.typing.delete(key);
    }
  }

  isTyping(fromUserId: string, toUserId: string): boolean {
    const key = this.key(fromUserId, toUserId);
    const expiresAt = this.typing.get(key);
    if (!expiresAt) return false;
    if (expiresAt <= Date.now()) {
      this.typing.delete(key);
      return false;
    }
    return true;
  }
}
