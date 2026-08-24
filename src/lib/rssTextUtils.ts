// Small text/encoding utility helpers shared by the RSS/HTML fetching and
// scraping logic in rss.ts. Kept dependency-free (no db/parser imports) so
// they stay easy to test/reuse in isolation.

/**
 * Decodes an HTTP response body respecting the charset declared either in the
 * Content-Type header or in the XML/HTML prologue (<?xml ... encoding="...">
 * or <meta charset="...">). fetch()'s response.text() always assumes UTF-8,
 * which corrupts accented characters (mojibake, e.g. "riuscir�") for feeds
 * served in ISO-8859-1/Windows-1252, common among Italian news sites.
 */
export async function decodeResponseText(response: Response): Promise<string> {
  const buffer = Buffer.from(await response.arrayBuffer());

  let charset = "";
  const contentType = response.headers.get("content-type") || "";
  const headerMatch = contentType.match(/charset=([^;]+)/i);
  if (headerMatch) charset = headerMatch[1].trim().toLowerCase();

  if (!charset) {
    // Sniff the declared encoding from the first bytes (XML prologue or HTML meta tag)
    const head = buffer.slice(0, 512).toString("ascii");
    const xmlMatch = head.match(/<\?xml[^>]*encoding=["']([^"']+)["']/i);
    const metaMatch = head.match(/<meta[^>]*charset=["']?([a-z0-9\-_]+)/i);
    if (xmlMatch) charset = xmlMatch[1].trim().toLowerCase();
    else if (metaMatch) charset = metaMatch[1].trim().toLowerCase();
  }

  if (charset && charset !== "utf-8" && charset !== "utf8") {
    try {
      return new TextDecoder(charset).decode(buffer);
    } catch {
      // Unsupported/unknown label, fall through to UTF-8
    }
  }

  return buffer.toString("utf-8");
}

type RssImageCandidate = {
  mediaContent?: Array<{ $?: { url?: string } }>;
  contentEncoded?: string;
  content?: string;
};

export function extractImageUrl(item: RssImageCandidate): string | null {
  if (item.mediaContent && item.mediaContent.length > 0) {
    return item.mediaContent[0]['$']?.url || null;
  }
  if (item.contentEncoded) {
    const match = item.contentEncoded.match(/<img[^>]+src="([^">]+)"/);
    if (match) return match[1];
  }
  if (item.content) {
    const match = item.content.match(/<img[^>]+src="([^">]+)"/);
    if (match) return match[1];
  }
  return null;
}

// Normalizes a link for deduplication purposes. Query strings are usually just
// tracking params and can be safely dropped, but some sites (notably YouTube's
// /watch?v=... URLs) use the query string itself to identify the resource, so
// stripping it there would collapse every video into the same "duplicate" link.
export function normalizeLink(link: string): string {
  const trimmed = (link || '').trim().toLowerCase();
  if (!trimmed) return '';
  if (trimmed.includes('youtube.com/watch') || trimmed.includes('youtu.be/')) {
    return trimmed.split('#')[0];
  }
  return trimmed.split('?')[0].split('#')[0];
}

export function stripHtml(html: string | undefined): string {
  if (!html) return '';
  return html.replace(/<[^>]*>?/gm, '');
}

export function cleanHtmlForAI(html: string): string {
  // Remove scripts, styles, and other non-content tags to save tokens
  let cleaned = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '') // remove navigation
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '') // remove footer
    .replace(/<!--[\s\S]*?-->/g, '') // remove comments
    .replace(/\s\s+/g, ' ') // collapse whitespace
    .trim();

  // If still too large, try to find a main content area
  if (cleaned.length > 30000) {
    const mainMatch = cleaned.match(/<main\b[^<]*>([\s\S]*?)<\/main>/i) ||
                      cleaned.match(/<div\b[^>]*id="content"[^>]*>([\s\S]*?)<\/div>/i) ||
                      cleaned.match(/<div\b[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    if (mainMatch) {
      cleaned = mainMatch[1];
    }
  }

  return cleaned.substring(0, 20000); // hard cap at 20k chars for AI analysis
}
