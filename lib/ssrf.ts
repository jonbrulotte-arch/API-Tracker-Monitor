export function isPublicUrl(rawUrl: string): boolean {
  try {
    const { hostname } = new URL(rawUrl);
    const h = hostname.toLowerCase();

    // Loopback — entire 127.0.0.0/8 range, not just 127.0.0.1
    if (h === "localhost" || h === "::1" || h === "0.0.0.0") return false;
    if (/^127\./.test(h)) return false;

    // RFC-1918 private ranges
    if (/^10\./.test(h)) return false;
    if (/^192\.168\./.test(h)) return false;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return false;

    // Link-local (APIPA)
    if (/^169\.254\./.test(h)) return false;

    // IPv6 unique-local and link-local
    if (/^fc[0-9a-f]{2}:/i.test(h) || /^fe80:/i.test(h)) return false;

    // IPv6-mapped IPv4 — recurse to check the embedded IPv4 address
    const ipv4mapped = h.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
    if (ipv4mapped) return isPublicUrl(`http://${ipv4mapped[1]}/`);

    // Internal hostnames
    if (h.endsWith(".local") || h.endsWith(".internal") || h.endsWith(".localhost")) return false;

    return true;
  } catch {
    return false;
  }
}
