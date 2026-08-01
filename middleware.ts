import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // CSRF Mitigation for Next.js Server Actions in Production
    const origin = req.headers.get("origin");
    const nextAction = req.headers.get("next-action");
    if (process.env.NODE_ENV === "production" && req.method === "POST" && nextAction) {
      const allowedOrigin = process.env.NEXTAUTH_URL;
      if (allowedOrigin && origin) {
        try {
          const originUrl = new URL(origin);
          const allowedUrl = new URL(allowedOrigin);
          if (originUrl.host !== allowedUrl.host) {
            return new NextResponse("Invalid Origin (CSRF Mitigation)", { status: 400 });
          }
        } catch {
          return new NextResponse("Bad Request", { status: 400 });
        }
      }
    }

    const url = req.nextUrl.clone();
    const requestTarget = `${url.pathname}${url.search}`;
    const token = req.nextauth.token;

    const isPublicUserPath = 
      url.pathname.startsWith("/user/dining") ||
      url.pathname.startsWith("/user/accommodation") ||
      url.pathname.startsWith("/user/tourism") ||
      url.pathname.startsWith("/user/news") ||
      url.pathname.startsWith("/user/events") ||
      url.pathname.startsWith("/user/projects") ||
      url.pathname.startsWith("/user/officials") ||
      url.pathname.startsWith("/user/hotlines");

    const isUserPath = url.pathname.startsWith("/user");
    const isAdminPath = url.pathname.startsWith("/admin");
    const isMayorPath = url.pathname.startsWith("/mayor");

    // Clean redirect if trying to access protected paths without a session
    if (!token && (isAdminPath || isMayorPath || (isUserPath && !isPublicUserPath))) {
      const redirectUrl = new URL("/auth/login", req.url);
      redirectUrl.searchParams.set("callbackUrl", requestTarget);
      return NextResponse.redirect(redirectUrl);
    }

    // Guard: Force users who need password setup to go to /auth/verify-otp
    if (token && token.isPasswordChanged === false) {
      const redirectUrl = new URL("/auth/verify-otp", req.url);
      return NextResponse.redirect(redirectUrl);
    }

    // Guard: MAYOR role is only allowed to access /mayor/dashboard
    if (token?.role === "MAYOR") {
      if (!url.pathname.startsWith("/mayor")) {
        const redirectUrl = new URL("/mayor/dashboard", req.url);
        return NextResponse.redirect(redirectUrl);
      }
    }

    // Guard: Non-MAYOR roles cannot access /mayor
    if (token?.role !== "MAYOR" && isMayorPath) {
      const redirectUrl = new URL(token?.role === "USER" ? "/" : "/admin/dashboard", req.url);
      return NextResponse.redirect(redirectUrl);
    }

    // Guard: USER role is never allowed to access admin routes
    if (token?.role === "USER" && url.pathname.startsWith("/admin")) {
      const redirectUrl = new URL("/", req.url);
      return NextResponse.redirect(redirectUrl);
    }

    // Guard: RHU roles (RHU_CENTER_ADMIN, RHU_DOCTOR, RHU_STAFF)
    const isRHURole =
      token?.role === "RHU_CENTER_ADMIN" ||
      token?.role === "RHU_DOCTOR" ||
      token?.role === "RHU_STAFF" ||
      token?.role === "RHU_PHARMACY" ||
      (token?.department && (token.department.includes("RHU") || token.department.includes("Medical Admin") || token.department.includes("Pharmacy")));

    if (isRHURole && url.pathname.startsWith("/admin")) {
      if (!url.pathname.startsWith("/admin/rhu")) {
        const redirectUrl = new URL("/admin/rhu/centers", req.url);
        return NextResponse.redirect(redirectUrl);
      }
      const requestHeaders = new Headers(req.headers);
      requestHeaders.set("x-pathname", url.pathname);
      requestHeaders.set("x-request-target", requestTarget);
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        }
      });
    }

    // Check custom page overrides if set
    const accessiblePages = token?.accessiblePages as string[] | undefined;
    if (accessiblePages && accessiblePages.length > 0 && url.pathname.startsWith("/admin")) {
      const isPathAllowed = accessiblePages.some(page => {
        // Exact match
        if (page === url.pathname) return true;
        
        // Match with query params (e.g. category=Birth Certificate)
        if (page.includes("?")) {
          const [pagePath, pageQuery] = page.split("?");
          if (pagePath === url.pathname) {
            const [paramKey, paramVal] = pageQuery.split("=");
            if (url.searchParams.get(paramKey) === decodeURIComponent(paramVal)) {
              return true;
            }
          }
        }
        
        // Allow sub-routes (e.g. /admin/residents/create if /admin/residents is allowed)
        if (!page.includes("?") && url.pathname.startsWith(page + "/")) {
          return true;
        }

        // Special case: allow treasury sub-routes if treasury access is enabled
        if (page.startsWith("/admin/treasury") && url.pathname.startsWith("/admin/treasury/")) {
          return true;
        }

        return false;
      });

      if (!isPathAllowed) {
        // Force logout: Clear session cookies and redirect to login page
        const redirectUrl = new URL("/auth/login", req.url);
        const response = NextResponse.redirect(redirectUrl);
        response.cookies.delete("next-auth.session-token");
        response.cookies.delete("__Secure-next-auth.session-token");
        response.cookies.delete("active_portal");
        return response;
      }
    }

    // Check if user is a BARANGAY_ADMIN and accessing admin pages
    if (
      token?.role === "BARANGAY_ADMIN" &&
      token?.managedBarangay &&
      url.pathname.startsWith("/admin")
    ) {
      const currentBarangay = url.searchParams.get("barangay");

      // Check if we already have the correct barangay in the URL
      // If not, redirect to the same URL but with the barangay parameter
      if (currentBarangay !== token.managedBarangay) {
        url.searchParams.set("barangay", token.managedBarangay as string);
        return NextResponse.redirect(url);
      }
    }

    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-pathname", url.pathname);
    requestHeaders.set("x-request-target", requestTarget);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      }
    });
  },
  {
    callbacks: {
      authorized: () => true,
    },
  }
);

export const config = {
  matcher: [
    "/admin/:path*",
    "/user/:path*",
    "/mayor/:path*",
  ],
};
