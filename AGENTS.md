# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->



ASLA GİT PUSH GİBİ TEHLİKELİ GİT KOMUTLARI KULLANMA.
HER ZAMAN PONYTAİL SKİLİNİ KULLAN.
HER ZAMAN UNSLOP SKİLİNİ KULLAN.
asla geriye dönük uyumluluk yapma.
asla convex prodda onay almadan işlem yapma. asla.

## Next.js 16 Kuralları ve Kesin Yasaklar (NEVER DO)

### 1. Senkron Request API Erişimi Kesinlikle Yasak
- `params` ve `searchParams` Promise'tir. Asla `params.id` veya `searchParams.q` senkron okunamaz. Her zaman `await props.params` ve `await props.searchParams` kullanılmalı (Client Component'te `use(params)`).
- `cookies()`, `headers()`, `draftMode()` Promise'tir. Asla `cookies().get()` çağrılamaz; her zaman `(await cookies()).get()` şeklinde async kullanılmalı.
- `generateMetadata`, `opengraph-image`, `icon` ve `sitemap` fonksiyonlarında gelen `params` ve `id` değerleri async karşılanmalı (`await params`, `await id`).

### 2. Server Action Güvenlik İhmalleri Kesinlikle Yasak
- Sayfa düzeyindeki auth/redirect kontrollerine güvenerek Server Action yazmak yasak. Server Action'lar bağımsız genel POST uç noktalarıdır; her action kendi içinde `auth()` ve sahiplik (authorization/IDOR) doğrulaması yapmalıdır.
- Client'tan gönderilen kullanıcı ID veya nesne verilerine asla güvenilmez; işlem yapan kullanıcı kimliği doğrudan session'dan alınmalıdır.
- Ham veritabanı kayıtları client'a döndürülmez, sadece arayüzün ihtiyaç duyduğu DTO alanları döndürülmelidir.
- Client tarafından `Promise.all` ile Server Action çağrıları paralel yapılmaya çalışılmaz; dispatcher istekleri sırayla yürütür.

### 3. Kaldırılan / Eski API'lerin Kullanımı Yasak
- `middleware.ts` artık `proxy.ts` oldu (fonksiyon adı `proxy`). `proxy` içinde Edge runtime desteklenmez, runtime `nodejs`'tir.
- `next/legacy/image` ve `images.domains` kaldırıldı / yasak. Sadece `next/image` ve `images.remotePatterns` kullanılır.
- `next lint` komutu ve `next.config` içindeki `eslint` alanı kaldırıldı; doğrudan `eslint` çalıştırılır.
- `serverRuntimeConfig` ve `publicRuntimeConfig` kaldırıldı; doğrudan `process.env` ve `NEXT_PUBLIC_*` kullanılır.
- `unstable_cacheLife` ve `unstable_cacheTag` önekleri kaldırıldı; doğrudan `cacheLife` ve `cacheTag` import edilir.
- `revalidateTag(tag)` tek argümanla çağrılamaz, profil zorunludur (`revalidateTag(tag, 'max')`). UI anlık güncellenecekse Server Action içinde `updateTag(tag)` kullanılır.
- `experimental_ppr`, `experimental.dynamicIO`, `experimental.useCache` kaldırıldı; bunun yerine üst düzey `cacheComponents: true` kullanılır.

### 4. Fetch ve Önbellek Hataları Yasak
- Next.js 15+ ile `fetch()` varsayılan olarak önbelleğe ALINMAZ (`no-store`). Otomatik cache varsayımı yapılmaz. Cache gerekiyorsa `{ cache: 'force-cache' }` veya `'use cache'` açıkça belirtilir.
- Route handler `GET` istekleri varsayılan olarak dinamiktir; statik cache isteniyorsa `export const dynamic = 'force-static'` eklenmelidir.
- Paralel route slotlarında (`@slot`) `default.tsx` dosyası unutulamaz; yoksa build kırılır.

## Design System

This project's design system and component library is documented in `docs/design-system.md`. It serves as the source of truth for color tokens, typography, spacing, radius, and components. Always consult `docs/design-system.md` before designing or building any UI.
