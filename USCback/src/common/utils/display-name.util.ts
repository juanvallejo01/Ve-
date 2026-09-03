/**
 * Regla de privacidad: por defecto solo se muestra el APODO de un usuario.
 * El nombre real solo se revela cuando:
 *   - el usuario está viendo su propia información, o
 *   - ya existe match con el usuario que está viendo.
 *
 * Si el usuario no tiene apodo configurado, se usa el nombre real como
 * respaldo (no hay nada más que mostrar).
 */
export function resolveDisplayName(
  target: { id: string; name: string; nickname?: string | null },
  viewerId: string,
  matched: Set<string> | boolean,
): string {
  const isMatched = typeof matched === 'boolean' ? matched : matched.has(target.id);
  if (target.id === viewerId || isMatched) return target.name;
  return target.nickname || target.name;
}
