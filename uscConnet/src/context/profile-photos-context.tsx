import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';

import { usersApi } from '@/lib/api-client';

import { useAuth } from './auth-context';

const MAX_PHOTOS = 8;

/**
 * The additional gallery photos shown on swipe cards in Descubrir — separate
 * from the "principal" profile photo, which lives on `User.photoUrl`. Backed
 * by `User.photos` on the backend so they actually reach other users, not just
 * this device.
 */
interface ProfilePhotosContextType {
  photos: string[];
  maxPhotos: number;
  addPhoto: (url: string) => Promise<void>;
  removePhoto: (index: number) => Promise<void>;
}

const ProfilePhotosContext = createContext<ProfilePhotosContextType>({
  photos: [],
  maxPhotos: MAX_PHOTOS,
  addPhoto: async () => {},
  removePhoto: async () => {},
});

export function ProfilePhotosProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<string[]>([]);
  // Mirrors `photos` synchronously so queued mutations always read the latest
  // value instead of a stale render-time closure.
  const photosRef = useRef<string[]>([]);
  // Serializes add/remove calls so uploading several photos in quick
  // succession (e.g. filling all 8 slots back-to-back) can't race and drop
  // one another — each mutation waits for the previous one to fully settle.
  const queueRef = useRef<Promise<void>>(Promise.resolve());

  // Seed from the authenticated user on load/login. Mutations below don't
  // depend on this afterwards, so it can't race with in-flight uploads.
  useEffect(() => {
    const next = user?.photos ?? [];
    photosRef.current = next;
    setPhotos(next);
  }, [user?.photos]);

  function enqueue(mutate: (current: string[]) => string[] | null) {
    const run = async () => {
      const next = mutate(photosRef.current);
      if (next === null) return;
      const previous = photosRef.current;
      photosRef.current = next;
      setPhotos(next);
      try {
        await usersApi.updateProfile({ photos: next });
      } catch (error) {
        photosRef.current = previous;
        setPhotos(previous);
        throw error;
      }
    };
    const result = queueRef.current.then(run, run);
    queueRef.current = result.catch(() => {});
    return result;
  }

  async function addPhoto(url: string) {
    await enqueue((current) => {
      if (current.length >= MAX_PHOTOS) throw new Error('PHOTOS_LIMIT_REACHED');
      if (current.includes(url)) return null;
      return [...current, url];
    });
  }

  async function removePhoto(index: number) {
    await enqueue((current) => current.filter((_, i) => i !== index));
  }

  return (
    <ProfilePhotosContext.Provider value={{ photos, maxPhotos: MAX_PHOTOS, addPhoto, removePhoto }}>
      {children}
    </ProfilePhotosContext.Provider>
  );
}

export function useProfilePhotos() {
  return useContext(ProfilePhotosContext);
}
