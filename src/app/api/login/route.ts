import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    // Validate environment variables at runtime
    const AUTH_URL = process.env.BACKEND_TESTING_AUTH_URL;
    const CREATE_USER_URL = process.env.BACKEND_TESTING_CREATE_USER_URL;

    if (!AUTH_URL || !CREATE_USER_URL) {
      console.error("Missing environment variables:", {
        AUTH_URL: !!AUTH_URL,
        CREATE_USER_URL: !!CREATE_USER_URL,
      });
      return NextResponse.json(
        { error: "Server configuration error. Please contact support." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { email, password, name, role_code, isSignup } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // If this is a signup request, create user first
    if (isSignup) {
      if (!name || !role_code) {
        return NextResponse.json(
          { error: "Name and role are required for registration" },
          { status: 400 }
        );
      }

      // STEP 1: Create user
      const createResponse = await fetch(CREATE_USER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          name,
          role_code,
          email_confirm: true,
        }),
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json().catch(() => null);
        
        // User already exists
        if (createResponse.status === 409) {
          return NextResponse.json(
            { error: "User already exists. Please login instead." },
            { status: 409 }
          );
        }

        return NextResponse.json(
          { 
            error: errorData?.message || errorData?.error || "Failed to create account",
            details: errorData 
          },
          { status: createResponse.status }
        );
      }

      // User created successfully (returns {})
      // Now proceed to login
    }

    // STEP 2: Login (either after signup or direct login)
    const loginResponse = await fetch(AUTH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!loginResponse.ok) {
      const errorData = await loginResponse.json().catch(() => null);
      
      if (loginResponse.status === 401) {
        return NextResponse.json(
          { error: "Invalid email or password" },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { 
          error: errorData?.message || errorData?.error || "Login failed",
          details: errorData 
        },
        { status: loginResponse.status }
      );
    }

    const loginData = await loginResponse.json();

    // Validate we got tokens
    if (!loginData.access_token) {
      return NextResponse.json(
        { error: "Invalid response from authentication service" },
        { status: 500 }
      );
    }

    // Create success response
    const res = NextResponse.json({
      success: true,
      user: loginData.user,
      message: isSignup 
        ? "Account created successfully! Welcome aboard!" 
        : "Welcome back!",
      isNewUser: !!isSignup,
    });

    // Set secure cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict" as const,
      path: "/",
    };

    res.cookies.set("token", loginData.access_token, {
      ...cookieOptions,
      maxAge: 60 * 60, // 1 hour
    });

    if (loginData.refresh_token) {
      res.cookies.set("refresh_token", loginData.refresh_token, {
        ...cookieOptions,
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
    }

    return res;

  } catch (error) {
    console.error("Auth error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}