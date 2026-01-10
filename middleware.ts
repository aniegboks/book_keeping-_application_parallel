import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const TEST_URL = process.env.BACKEND_TESTING_TEST_URL!;
const REFRESH_URL = process.env.BACKEND_TESTING_REFRESH_URL!;

// Super admin emails that bypass privilege checks
const SUPER_ADMIN_EMAILS = (process.env.SUPER_ADMIN_EMAILS || '').split(',').map(e => e.trim());

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const refreshToken = request.cookies.get("refresh_token")?.value;

  if (!token) {
    return redirectToLogin(request);
  }

  try {
    const verify = await fetch(TEST_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (verify.ok) {
      const userData = await verify.json();
      
      // Check if user is super admin
      const userEmail = userData?.user?.email;
      if (userEmail && SUPER_ADMIN_EMAILS.includes(userEmail)) {
        // Super admin - allow through
        const response = NextResponse.next();
        response.headers.set('x-super-admin', 'true');
        return response;
      }

      return NextResponse.next();
    }

    // Token expired - try refresh
    if (verify.status === 401 && refreshToken) {
      const newTokens = await attemptTokenRefresh(refreshToken);
      
      if (newTokens) {
        const response = NextResponse.next();
        setAuthCookies(response, newTokens);
        return response;
      }
    }

    return redirectToLogin(request);
    
  } catch (err) {
    console.error("Middleware error:", err);
    return redirectToLogin(request);
  }
}

async function attemptTokenRefresh(refreshToken: string) {
  try {
    const refreshResponse = await fetch(REFRESH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (refreshResponse.ok) {
      return await refreshResponse.json();
    }
    return null;
  } catch (error) {
    console.error("Token refresh failed:", error);
    return null;
  }
}

function redirectToLogin(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.delete("token");
  response.cookies.delete("refresh_token");
  return response;
}

function setAuthCookies(response: NextResponse, data: any) {
  const cookieOptions = {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };

  response.cookies.set("token", data.access_token, {
    ...cookieOptions,
    maxAge: 60 * 60,
  });

  if (data.refresh_token) {
    response.cookies.set("refresh_token", data.refresh_token, {
      ...cookieOptions,
      maxAge: 60 * 60 * 24 * 7,
    });
  }
}

export const config = {
  matcher: [
    "/((?!api/|_next/static|_next/image|favicon.ico|images/|login$).*)",
  ],
};