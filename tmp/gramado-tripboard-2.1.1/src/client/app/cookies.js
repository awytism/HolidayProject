export function createCookieStore(cookieDocument = document) {
  return {
    get(name) {
      const prefix = `${encodeURIComponent(name)}=`;
      const item = String(cookieDocument.cookie ?? "").split(";").map((part) => part.trim())
        .find((part) => part.startsWith(prefix));
      if (!item) return null;
      try {
        return decodeURIComponent(item.slice(prefix.length));
      } catch {
        return null;
      }
    },
    set(name, value, options = {}) {
      const parts = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`];
      parts.push(`Path=${options.path ?? "/"}`);
      if (options.maxAge) parts.push(`Max-Age=${options.maxAge}`);
      parts.push(`SameSite=${options.sameSite ?? "Lax"}`);
      if (options.secure) parts.push("Secure");
      cookieDocument.cookie = parts.join("; ");
    },
  };
}
