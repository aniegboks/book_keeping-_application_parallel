// app/api/proxy/[...path]/route.ts
import { NextRequest, NextResponse } from "next/server";

// Use the correct backend URL from env
const BACKEND_BASE_URL = process.env.BACKEND_TESTING_API_BASE_URL || 'https://kayron-backend-testing.onrender.com/api/v1';
const MAX_RETRIES = 8;
const INITIAL_RETRY_DELAY = 2000;
const MAX_TOTAL_WAIT_TIME = 60 * 60 * 1000;

interface Context {
    params: Promise<{ path: string[] }>;
}

async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(
    url: string,
    options: RequestInit,
    requestedPath: string,
    method: string
): Promise<Response> {
    const startTime = Date.now();
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            const elapsed = Date.now() - startTime;
            if (elapsed > MAX_TOTAL_WAIT_TIME) {
                throw new Error(`Request timeout: Backend took too long (>1 hour)`);
            }

            const response = await fetch(url, options);

            // Retry on backend hibernation (502/503)
            if ((response.status === 502 || response.status === 503) && attempt < MAX_RETRIES - 1) {
                const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, attempt), 32000);
                console.log(`🔄 Backend hibernating (${response.status}) - Retry ${attempt + 1}/${MAX_RETRIES} in ${delay / 1000}s for ${method} ${requestedPath}`);
                await sleep(delay);
                continue;
            }

            if (attempt > 0 && response.ok) {
                console.log(`✅ Backend awake! ${method} ${requestedPath} succeeded after ${attempt + 1} attempts`);
            }

            return response;

        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            if (attempt === MAX_RETRIES - 1) {
                console.error(`❌ All retries exhausted for ${method} ${requestedPath}`);
                throw lastError;
            }

            const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, attempt), 32000);
            console.log(`⚠️ Request failed - Retry ${attempt + 1}/${MAX_RETRIES} in ${delay / 1000}s for ${method} ${requestedPath}`, lastError.message);
            await sleep(delay);
        }
    }

    throw lastError || new Error('Max retries exceeded');
}

async function handleRequest(request: NextRequest, context: Context) {
    try {
        const token = request.cookies.get("token")?.value;
        if (!token) {
            return NextResponse.json({ error: "Authentication required" }, { status: 401 });
        }

        const { path } = await context.params;
        const requestedPath = path.join('/');
        const fullBackendUrl = `${BACKEND_BASE_URL}/${requestedPath}${request.nextUrl.search}`;

        console.log(`🔗 Proxying ${request.method} ${requestedPath} to ${fullBackendUrl}`);

        // Clean headers
        const headers = new Headers(request.headers);
        headers.set('Authorization', `Bearer ${token}`);
        headers.delete('host');
        headers.delete('content-length');
        headers.delete('origin');

        // Optional GET-after-POST delay
        if (request.method === 'GET' && request.headers.get('x-retry-after-post') === 'true') {
            await sleep(1000);
        }

        // Body for write requests
        let body: ReadableStream | null = null;
        if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
            body = request.body;
        }

        const fetchOptions: RequestInit & { duplex?: "half" } = {
            method: request.method,
            headers,
            body,
            cache: 'no-store',
        };
        if (body) fetchOptions.duplex = 'half';

        // Fetch with retry logic
        const backendRes = await fetchWithRetry(fullBackendUrl, fetchOptions, requestedPath, request.method);

        // Handle DELETE 204
        if (request.method === 'DELETE' && backendRes.status === 204) {
            return new NextResponse(null, { status: 204 });
        }

        // Read response once
        const responseText = await backendRes.text();

        // Handle backend errors
        if (!backendRes.ok) {
            console.error(`PROXY ERROR: ${backendRes.status} ${request.method} ${requestedPath}`);
            console.error("Backend response:", responseText);

            return new NextResponse(responseText, {
                status: backendRes.status,
                headers: {
                    'Content-Type': backendRes.headers.get('Content-Type') || 'application/json',
                },
            });
        }

        // Parse JSON if possible
        try {
            const responseBody = JSON.parse(responseText);
            return NextResponse.json(responseBody, { status: backendRes.status });
        } catch {
            return new NextResponse(responseText, {
                status: backendRes.status,
                headers: {
                    'Content-Type': backendRes.headers.get('Content-Type') || 'text/plain',
                },
            });
        }

    } catch (error) {
        console.error("CRITICAL PROXY FAILURE:", error);
        return NextResponse.json({
            error: "Failed to connect to external service",
            details: error instanceof Error ? error.message : "Unknown error",
        }, { status: 500 });
    }
}

// Export all HTTP methods
export const GET = handleRequest;
export const POST = handleRequest;
export const PUT = handleRequest;
export const DELETE = handleRequest;
export const PATCH = handleRequest;