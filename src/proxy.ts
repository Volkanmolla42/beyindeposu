import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

const isHomePage = createRouteMatcher(["/"]);
const isSignInPage = createRouteMatcher(["/login"]);
const isProtectedRoute = createRouteMatcher(["/admin(.*)"]);

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  const authenticated = await convexAuth.isAuthenticated();

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
