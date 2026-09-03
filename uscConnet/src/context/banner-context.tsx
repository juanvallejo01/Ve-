import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

import { usersApi } from '@/lib/api-client';

import { useAuth } from './auth-context';

/**
 * El banner del perfil vive en `User.bannerUrl` (backend) — antes se guardaba
 * solo en localStorage, sin ligarlo a la cuenta, así que una cuenta nueva
 * "heredaba" el banner que hubiera quedado de otra cuenta usada antes en el
 * mismo navegador. Ahora empieza en blanco para cada cuenta nueva y persiste
 * por usuario.
 */
interface BannerContextType {
  banner: string | null;
  setBanner: (url: string) => Promise<void>;
  clearBanner: () => Promise<void>;
}

const BannerContext = createContext<BannerContextType>({
  banner: null,
  setBanner: async () => {},
  clearBanner: async () => {},
});

export function BannerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [banner, setBannerState] = useState<string | null>(null);

  useEffect(() => {
    setBannerState(user?.bannerUrl ?? null);
  }, [user?.bannerUrl]);

  async function persist(url: string | null) {
    const previous = banner;
    setBannerState(url);
    try {
      await usersApi.updateProfile({ bannerUrl: url });
    } catch (error) {
      setBannerState(previous);
      throw error;
    }
  }

  async function setBanner(url: string) {
    await persist(url);
  }

  async function clearBanner() {
    await persist(null);
  }

  return (
    <BannerContext.Provider value={{ banner, setBanner, clearBanner }}>
      {children}
    </BannerContext.Provider>
  );
}

export function useBanner() {
  return useContext(BannerContext);
}
