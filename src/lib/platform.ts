const isMac =
  typeof navigator !== "undefined" && /Macintosh|Mac OS X/.test(navigator.userAgent);

export const MOD = isMac ? "⌘" : "Ctrl+";
export const MOD_SHIFT = isMac ? "⌘⇧" : "Ctrl+Shift+";
