export function setAuthCookie(token: string): void {
  if (typeof document === 'undefined') return;
  const maxAge = 7 * 24 * 60 * 60;
  const secureFlag = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `token=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secureFlag}`;
}

export function clearAuthCookie(): void {
  if (typeof document === 'undefined') return;
  const secureFlag = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `token=; Path=/; Max-Age=0; SameSite=Lax${secureFlag}`;
}

