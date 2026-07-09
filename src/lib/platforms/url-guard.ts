/**
 * SSRF guard for user-supplied store URLs.
 *
 * Platform integrations (WooCommerce, Magento, PrestaShop, OpenCart, ...) let
 * users paste their own store URL, which then becomes the target of server-side
 * fetch() calls. Without validation, a malicious user could point us at
 * internal services (localhost, private LAN ranges, the cloud metadata endpoint,
 * etc.) — a classic Server-Side Request Forgery (SSRF) vector.
 *
 * This module centralizes the check: force https, and reject loopback,
 * link-local, private, and other internal hosts.
 */

/**
 * Returns true if the hostname resolves to (or literally is) an internal /
 * private / loopback / link-local address that we must never fetch from.
 */
export function isPrivateHostname(hostname: string): boolean {
  // Normalize: lowercase and strip IPv6 brackets like [::1]
  const host = hostname.toLowerCase().replace(/^\[/, '').replace(/\]$/, '');

  if (!host) return true;

  // Hostname-based internal names
  if (host === 'localhost') return true;
  if (host.endsWith('.localhost')) return true;
  if (host.endsWith('.local')) return true;

  // IPv6 loopback / unique-local (fc00::/7 -> fc.. or fd..) / link-local (fe80::/10)
  if (host === '::1' || host === '::') return true;
  if (host.startsWith('fc') || host.startsWith('fd')) return true;
  if (host.startsWith('fe8') || host.startsWith('fe9') || host.startsWith('fea') || host.startsWith('feb')) return true;

  // IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1) — pull out the trailing dotted quad
  const mapped = host.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  const ipv4Candidate = host.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/) ? host : (mapped ? mapped[1] : null);

  if (ipv4Candidate) {
    const parts = ipv4Candidate.split('.').map(Number);
    if (parts.length === 4 && parts.every((n) => Number.isInteger(n) && n >= 0 && n <= 255)) {
      const [a, b] = parts;
      if (a === 0) return true; // 0.0.0.0/8 "this network"
      if (a === 127) return true; // 127.0.0.0/8 loopback
      if (a === 10) return true; // 10.0.0.0/8 private
      if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 private
      if (a === 192 && b === 168) return true; // 192.168.0.0/16 private
      if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local (incl. 169.254.169.254 metadata)
      if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
      if (a >= 224) return true; // multicast / reserved
    }
  }

  return false;
}

/**
 * Validate a normalized store URL before it is used as a fetch target.
 *
 * Requires https and a public hostname. Throws Error('Invalid store URL') on
 * any violation. Returns the URL unchanged (for convenient inline use).
 */
export function assertPublicStoreUrl(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('Invalid store URL');
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('Invalid store URL');
  }

  if (isPrivateHostname(parsed.hostname)) {
    throw new Error('Invalid store URL');
  }

  return url;
}
