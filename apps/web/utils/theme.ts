// Theme utility helpers

export function getStoredTheme(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("theme")
  }
  return null
}

export function setStoredTheme(theme: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("theme", theme)
  }
}
