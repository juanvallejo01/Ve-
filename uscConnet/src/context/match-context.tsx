import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

import { likesApi, matchesApi } from '@/lib/api-client';
import type { Like, Match } from '@/types';

import { useAuth } from './auth-context';

interface MatchState {
  sentLikes: Like[];
  matches: Match[];
  loading: boolean;
  likeUser: (receiverId: string) => Promise<{ success: boolean; matched?: boolean }>;
  hasLiked: (receiverId: string) => boolean;
  isMatched: (userId: string) => boolean;
  canChat: (userId: string) => boolean;
  refresh: () => Promise<void>;
}

const MatchContext = createContext<MatchState | null>(null);

export function MatchProvider({ children }: { children: ReactNode }) {
  const { isLoggedIn } = useAuth();
  const [sentLikes, setSentLikes] = useState<Like[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isLoggedIn) return;
    setLoading(true);
    try {
      const [likes, matchList] = await Promise.all([
        likesApi.getSentLikes(),
        matchesApi.getMatches(),
      ]);
      setSentLikes(likes);
      setMatches(matchList);
    } catch (error) {
      console.error('Failed to load likes/matches:', error);
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn) {
      refresh();
    } else {
      setSentLikes([]);
      setMatches([]);
    }
  }, [isLoggedIn, refresh]);

  const hasLiked = useCallback(
    (receiverId: string): boolean => {
      return sentLikes.some((like) => like.receiverId === receiverId);
    },
    [sentLikes]
  );

  const isMatched = useCallback(
    (userId: string): boolean => {
      return matches.some((match) => match.matchedUser.id === userId);
    },
    [matches]
  );

  const canChat = isMatched;

  const likeUser = useCallback(
    async (receiverId: string): Promise<{ success: boolean; matched?: boolean }> => {
      try {
        const result = await likesApi.createLike(receiverId);
        setSentLikes((prev) => [...prev, result.like]);
        if (result.matchCreated) {
          // Refresh matches so we get the resolved matchedUser info
          try {
            const matchList = await matchesApi.getMatches();
            setMatches(matchList);
          } catch (error) {
            console.error('Failed to refresh matches:', error);
          }
        }
        return { success: true, matched: !!result.matchCreated };
      } catch (error) {
        console.error('Failed to like user:', error);
        return { success: false };
      }
    },
    []
  );

  return (
    <MatchContext.Provider
      value={{
        sentLikes,
        matches,
        loading,
        likeUser,
        hasLiked,
        isMatched,
        canChat,
        refresh,
      }}
    >
      {children}
    </MatchContext.Provider>
  );
}

export function useMatch() {
  const ctx = useContext(MatchContext);
  if (!ctx) throw new Error('useMatch must be used within MatchProvider');
  return ctx;
}
