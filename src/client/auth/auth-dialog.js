export function createAuthController(api) {
  let session = null;

  return {
    async ensureSession() {
      if (session) return session;
      session = await api.getSession();
      return session;
    },
    async ensureAuthenticated() {
      if (session?.authenticated) return session;
      session = await api.getSession();
      if (session.authenticated) return session;
      session = await api.enableEditing(session.csrfToken);
      return session;
    },
    getSession: () => session,
  };
}
