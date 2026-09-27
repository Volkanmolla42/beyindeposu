# Repository Guidelines

## Project Structure

`src/app/` holds routes and admin pages; `src/components/` shared UI; `src/{config,lib,types}/` support code. `convex/` contains backend and schema; `scripts/` import tools; `public/images/` website assets; `docs/` research.

## Development Commands

- `npm ci` installs dependencies.
- `npm run dev` starts Next.js and Convex; `npm run dev:next` and `npm run dev:convex` start one service.
- `npm run lint` runs ESLint; `npm run build` builds; `npm start` serves the build.

## Style, Assets, and Copy

Use strict TypeScript, two-space indentation, double quotes, semicolons, and the `@/` alias for `src/` imports. Name React components `PascalCase`; keep route directories and utility files lowercase. Convert each image to WebP before website use; store website images in `public/images/` and never use PNG assets on the site. Keep UI copy purposeful; omit redundant titles, subtitles, hints, and helper text.

## Testing

No test runner or test files are configured. Available automated checks are `npm run lint` and `npm run build`; preview affected routes for UI changes.

## Commits and Pull Requests

Recent history has no consistent subject format (`up` and descriptive feature summaries both appear). Use short imperative subjects, such as `Add admin product filters`. PRs should summarize changes, list checks, link related issues when available, and include UI screenshots.

## Configuration and Safety

Keep credentials in `.env.local`, never commit secrets, and add required keys to `.env.example`. Do not run `git push` or other risky Git commands. Do not modify Convex production without explicit approval.

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

asla convex prodda onay almadan işlem yapma. asla.