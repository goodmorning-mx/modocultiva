/** Remove only the generic, localized "Mode" wrapper, never the mode word. */
export function lifeMapLabel(fullName: string): string {
  return fullName
    .replace(/^(?:Modo|Mode|Modalità|الوضع)\s+/iu, '')
    .replace(/(?:\s+(?:Mode|Modus|режим|मोड)|模式)$/iu, '')
    .trim();
}
