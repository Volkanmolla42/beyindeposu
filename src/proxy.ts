import { NextResponse } from "next/server";
import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";
import { getFunctionName } from "convex/server";
import { api } from "@convex/_generated/api";

const PUBLISHED_SLUG_EXISTS = getFunctionName(api.blogs.publishedSlugExists);

const isHomePage = createRouteMatcher(["/"]);
const isSignInPage = createRouteMatcher(["/login"]);
const isProtectedRoute = createRouteMatcher(["/admin(.*)"]);

function getBlogSlug(pathname: string): string | null {
  const match = pathname.match(/^\/blog\/([^/]+)\/?$/);
  if (!match) return null;

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

const BLOG_SLUG_CACHE_TTL_MS = 5 * 60 * 1000;
const BLOG_SLUG_CACHE_MAX_ENTRIES = 500;
const blogSlugCache = new Map<string, { exists: boolean; expiresAt: number }>();

async function publishedBlogExists(slug: string): Promise<boolean | null> {
  const now = Date.now();
  const cached = blogSlugCache.get(slug);
  if (cached && cached.expiresAt > now) {
    return cached.exists;
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) return null;

  const baseUrl = convexUrl.replace(/\/+$/, "");

  try {
    const response = await fetch(`${baseUrl}/api/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: PUBLISHED_SLUG_EXISTS,
        args: { slug },
        format: "json",
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(2_500),
    });

    if (!response.ok) return null;

    const result = (await response.json()) as {
      status?: string;
      value?: unknown;
    };

    if (result.status !== "success") return null;
    if (typeof result.value !== "boolean") return null;

    if (blogSlugCache.size >= BLOG_SLUG_CACHE_MAX_ENTRIES) {
      blogSlugCache.clear();
    }
    blogSlugCache.set(slug, {
      exists: result.value,
      expiresAt: now + BLOG_SLUG_CACHE_TTL_MS,
    });
    return result.value;
  } catch {
    return null;
  }
}

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  const blogSlug = getBlogSlug(request.nextUrl.pathname);

  // The page starts streaming before notFound() runs, so this check must happen
  // here to return a real 404 status instead of a soft 404.
  const [blogExists, authenticated] = await Promise.all([
    blogSlug ? publishedBlogExists(blogSlug) : Promise.resolve(null),
    convexAuth.isAuthenticated(),
  ]);

  if (blogExists === false) {
    return NextResponse.rewrite(new URL(request.url), { status: 404 });
  }

  // If already authenticated and visits home or login, redirect to admin panel
  if ((isHomePage(request) || isSignInPage(request)) && authenticated) {
    return nextjsMiddlewareRedirect(request, "/admin");
  }

  // If not authenticated and tries to visit admin routes, redirect to login
  if (isProtectedRoute(request) && !authenticated) {
    return nextjsMiddlewareRedirect(request, "/login");
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
