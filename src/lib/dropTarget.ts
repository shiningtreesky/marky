/**
 * Resolve which pane owns a drop point. Tauri reports drag-and-drop positions
 * in physical pixels, so callers divide by devicePixelRatio before using this.
 */
export function paneIdFromPoint(clientX: number, clientY: number): string | null {
  const target = document.elementFromPoint(clientX, clientY);
  const pane = target?.closest<HTMLElement>("[data-pane-id]");
  return pane?.dataset.paneId ?? null;
}
