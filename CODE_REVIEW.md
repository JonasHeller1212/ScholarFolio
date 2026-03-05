# Code Review — ScholarMetricsAnalyzer

**Date:** 2026-03-05
**Reviewer:** Claude Code
**Version:** 0.9.16

## Summary

| Severity | Count | Top Themes |
|----------|-------|------------|
| Critical | 5 | Leaked API key, SSRF, race conditions, React anti-patterns |
| High | 9 | Crashes on empty data, XSS, memory leaks, wrong API usage |
| Medium | 11 | Code duplication, dead code, accessibility, false positives |
| Low | 8 | Over-aggressive normalization, stubs, minor UX bugs |
| **Total** | **33** | |

---

## CRITICAL (5 issues)

### 1. Hardcoded SerpAPI key in source code
- **File:** `supabase/functions/scholar/index.ts:17`
- The SerpAPI key is committed in plaintext. Anyone with repo access can use or abuse this key.
- **Fix:** Move to environment variable (`Deno.env.get('SERPAPI_KEY')`), rotate the current key immediately.

### 2. SSRF via open CORS proxy relay
- **File:** `src/services/scholar/fetcher.ts:5-8`
- User-supplied URLs are forwarded through third-party CORS proxies without strict validation, enabling Server-Side Request Forgery.
- **Fix:** Validate that `url` strictly matches `https://scholar.google.com/citations*` before proxying. Consider running your own proxy.

### 3. Race condition in RateLimiter
- **File:** `src/services/scholar/rate-limiter.ts:11-33`
- `acquireToken()` is async but not mutex-protected. Two concurrent callers can both pass the rate-limit check.
- **Fix:** Add a chained-promise mutex to serialize calls.

### 4. Component defined inside render function
- **File:** `src/App.tsx:96-117`
- `SocialLinks` is declared inside `App`, causing full unmount/remount every render.
- **Fix:** Move `SocialLinks` to a separate file or outside the `App` function body.

### 5. Stale closure in `handleSearch`
- **File:** `src/App.tsx:28-86`
- `requestInProgress` guard captures stale state. Rapid double-clicks can trigger concurrent searches.
- **Fix:** Use `useRef` for the in-progress flag.

---

## HIGH (9 issues)

### 6. Division by zero / crash on empty publications
- **File:** `src/services/scholar/metrics.ts:249-251, 269-273`
- `calculateCoAuthorStats` divides by `publications.length` without a zero guard. `findMostCitedPaper` accesses `publications[0]` on an empty array.
- **Fix:** Add early returns with default values when `publications.length === 0`.

### 7. G-index test expectation is wrong
- **File:** `src/services/metrics/citation/g-index.ts:9-15`
- Test expects `calculateGIndex([100, 90, 80, 70, 60])` to return `12`, but max possible with 5 papers is 5.
- **Fix:** Correct the test expectation or clarify intended extrapolation semantics.

### 8. Variable shadowing: `currentYear`
- **Files:** `src/services/metrics/trends/growth-metrics.ts:40`, `src/services/scholar/metrics.ts:66`
- Inner loop variable shadows outer `currentYear` declaration.
- **Fix:** Rename inner variable.

### 9. DOMPurify misused on URLs
- **File:** `src/components/SearchBar.tsx:61`
- `DOMPurify.sanitize()` is for HTML, not URLs. May strip valid URL characters.
- **Fix:** Remove DOMPurify for URL handling; rely on URL parsing + `encodeURIComponent`.

### 10. XSS in embed code generation
- **File:** `src/components/EmbedModal.tsx:15-22`
- `scholarId` interpolated directly into iframe `src` without sanitization.
- **Fix:** Validate `scholarId` to alphanumeric characters only.

### 11. CitationNetwork crash on empty data
- **File:** `src/components/CitationNetwork.tsx:92-93`
- Accesses `[0][0]` on potentially empty `authorFrequency` entries.
- **Fix:** Add guard before destructuring.

### 12. Memory leaks: uncleared timers
- **Files:** `src/components/Tooltip.tsx:17-29`, `src/components/EmbedModal.tsx:27`
- `setTimeout` callbacks never cleaned up on unmount.
- **Fix:** Store timeout IDs in refs, clear in `useEffect` cleanup.

### 13. Placeholder API contact emails
- **Files:** `src/services/crossref/index.ts:6,9`, `src/services/openalex/index.ts:7`
- Contain placeholder emails. Crossref's polite pool requires real contact info.
- **Fix:** Move to environment variables.

### 14. Semantic Scholar API uses wrong endpoint
- **File:** `src/services/semantic/index.ts:16`
- `scholarid:` prefix is not valid for Semantic Scholar's API.
- **Fix:** Use the correct external ID endpoint.

---

## MEDIUM (11 issues)

### 15. Duplicate `MetricsCalculator` classes
- **Files:** `src/services/metrics/index.ts` vs `src/services/scholar/metrics.ts`
- Two independently maintained calculators with divergent logic.
- **Fix:** Consolidate into a single source of truth.

### 16. Unbounded in-memory caches
- **Files:** `src/services/scholar/cache.ts`, `src/services/metrics/api.ts:5`
- Caches grow without bound; `clearExpired()` never called automatically.
- **Fix:** Add LRU eviction or periodic cleanup.

### 17. `validateResponse` false positives
- **File:** `src/services/scholar/fetcher.ts:83-125`
- `text.includes('not found')` on entire HTML body matches legitimate content.
- **Fix:** Restrict checks to specific HTML elements.

### 18. `isSubstantialMatch` unreliable fuzzy matching
- **File:** `src/services/journal/index.ts:89-103`
- Character frequency matching produces false positives.
- **Fix:** Use Levenshtein distance or Jaccard similarity on word sets.

### 19. Dead code: `crossrefData?.issn`
- **File:** `src/services/journal/index.ts:32`
- `JournalRanking` has no `issn` field; this branch is always dead.
- **Fix:** Remove or implement properly.

### 20. OpenAlex ISSN injection
- **File:** `src/services/openalex/index.ts:18`
- `issn` interpolated into URL without encoding.
- **Fix:** Use `encodeURIComponent(issn)`.

### 21. CORS headers allow all origins
- **File:** `supabase/functions/scholar/index.ts:10-14`
- `Access-Control-Allow-Origin: *` lets any site consume your API.
- **Fix:** Restrict to your deployed domain(s).

### 22. List items keyed by array index
- **Files:** `PublicationsList.tsx:131`, `CoAuthorCard.tsx:82`, `TopicsList.tsx:15`
- Using `key={index}` on sortable lists causes DOM mismatch after re-sort.
- **Fix:** Use stable unique identifiers (e.g., `pub.url`, `topic.url`).

### 23. Console.log in production code
- **Files:** `src/App.tsx`, `PublicationsList.tsx`, `supabase/functions/scholar/index.ts`
- Debug logging leaks internal state to the browser console.
- **Fix:** Remove or use a conditional logger disabled in production.

### 24. Modals lack keyboard accessibility
- **Files:** All modal components
- No Escape-to-close, no focus trapping, missing ARIA roles.
- **Fix:** Add `role="dialog"`, `aria-modal`, Escape handler, and focus trapping.

### 25. D3 zoom applies to all `<g>` elements
- **File:** `src/components/CitationNetwork.tsx:297-301`
- `svg.selectAll('g')` applies zoom to every group including `<defs>`.
- **Fix:** Apply zoom to a single container `<g>` wrapping nodes and links.

---

## LOW (8 issues)

### 26. `normalizeVenueName` over-strips
- **File:** `src/services/journal/index.ts:75-86`
- Regex removes everything after first space-digit, breaking names like "3D Printing".

### 27. `findPeakYear` returns undefined for empty array
- **File:** `src/services/scholar/metrics.ts:262-266`

### 28. Stub services return empty objects silently
- **Files:** `src/services/scimago/index.ts`, `src/services/crossref/index.ts:42-45`

### 29. `error.name` access without type narrowing
- **File:** `src/services/scholar/fetcher.ts:53`

### 30. Hardcoded embed URL
- **File:** `src/components/EmbedModal.tsx:16`
- `scholar-metrics.netlify.app` should be an environment variable.

### 31. Duplicate error display
- **File:** `src/components/SearchBar.tsx:95-99, 143-150`

### 32. `hoveredFeature` state causes unnecessary re-renders
- **File:** `src/components/LandingPage.tsx:14`

### 33. `consecutiveProxyFailures` conflates failure modes
- **File:** `src/services/scholar/fetcher.ts:130-176`

---

## Priority Recommendations

1. **Immediately** rotate and move the SerpAPI key to environment variables (#1)
2. **Immediately** restrict CORS proxy URLs to scholar.google.com only (#2)
3. **Soon** fix crashes on empty data (#6, #11) and memory leaks (#12)
4. **Soon** move `SocialLinks` outside `App` and fix the stale closure (#4, #5)
5. **Plan** consolidate the duplicate `MetricsCalculator` (#15)
6. **Plan** add modal accessibility (#24) and fix list keys (#22)
