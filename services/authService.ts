const TOKEN_KEY = 'agent7_auth_token';

export const authService = {
  async login(password: string): Promise<{ token: string; expiresAt: number }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    if (!res.ok) throw new Error('Authentication failed');
    const data = await res.json();
    localStorage.setItem(TOKEN_KEY, data.token);
    return data;
  },

  async logout(): Promise<void> {
    const token = this.getToken();
    if (token) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    }
    localStorage.removeItem(TOKEN_KEY);
  },

  async verify(): Promise<boolean> {
    const token = this.getToken();
    if (!token) return false;
    try {
      const res = await fetch('/api/auth/verify', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      return data.valid === true;
    } catch {
      return false;
    }
  },

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  getAuthHeaders(): { 'Authorization': string } | {} {
    const token = this.getToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }
};
