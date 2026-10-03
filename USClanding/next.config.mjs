import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // La raíz del repo tiene otro package-lock.json; sin esto Next toma todo el
  // monorepo como raíz y vigila también la app y el backend (se cuelga).
  turbopack: {
    root: dirname(fileURLToPath(import.meta.url)),
  },
}

export default nextConfig
