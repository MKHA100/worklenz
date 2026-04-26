import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/prelim(.*)",
  "/api/files(.*)",
  "/api/attendance(.*)",
  "/api/offices(.*)",
  "/api/jcc(.*)",
  "/api/tasks(.*)",
  "/api/projects(.*)",
  "/api/realtime(.*)",
  "/api/users(.*)"
]);

// Webhooks and crons are verified by their own secrets — not Clerk auth.
const isPublicApiRoute = createRouteMatcher([
  "/api/webhooks(.*)",
  "/api/cron(.*)",
  "/api/health"
]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicApiRoute(req)) return;
  // Default-deny: all /api routes and explicit protected UI routes require auth.
  if (isProtectedRoute(req) || req.nextUrl.pathname.startsWith("/api/")) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpg|jpeg|webp|png|gif|svg|ttf|woff2?|ico|csv|zip)).*)",
    "/(api|trpc)(.*)"
  ]
};
