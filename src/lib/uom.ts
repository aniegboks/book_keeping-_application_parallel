// src/lib/uom.ts

const BASE_URL = "/api/proxy/uoms"; // Changed from "/api/uoms"

// Helper to get the full URL (handles both client and server)
function getFullUrl(path: string): string {
  // Check if we're on the server
  if (typeof window === 'undefined') {
    // Server-side: construct absolute URL
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const host = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || 'localhost:3000';
    return `${protocol}://${host}${path}`;
  }
  // Client-side: use relative URL
  return path;
}

// Error details type for better type safety
interface ErrorDetails {
  message?: string;
  error?: string;
  detail?: string;
  errors?: Record<string, string[]>;
  [key: string]: unknown;
}

// Custom error class for better error handling
class UOMApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: ErrorDetails
  ) {
    super(message);
    this.name = "UOMApiError";
  }
}

/**
 * Enhanced fetch wrapper with detailed error handling
 */
async function fetchWithErrorHandling(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  try {
    const fullUrl = getFullUrl(url); // Convert to absolute URL if on server
    const response = await fetch(fullUrl, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      
      // Extract the actual error message from various possible formats
      const serverMessage = errorData?.message || errorData?.error || errorData?.detail;

      // Handle 401 Unauthorized
      if (response.status === 401) {
        throw new UOMApiError(
          serverMessage || "Session expired. Please log in again.",
          401,
          errorData
        );
      }

      // Handle 403 Forbidden
      if (response.status === 403) {
        throw new UOMApiError(
          serverMessage || "You don't have permission to perform this action.",
          403,
          errorData
        );
      }

      // Handle 404 Not Found
      if (response.status === 404) {
        throw new UOMApiError(
          serverMessage || "Unit of measurement not found.",
          404,
          errorData
        );
      }

      // Handle 409 Conflict (e.g., duplicate name or symbol)
      if (response.status === 409) {
        throw new UOMApiError(
          serverMessage || "A unit of measurement with this name or symbol already exists.",
          409,
          errorData
        );
      }

      // Handle 422 Validation Error
      if (response.status === 422) {
        if (errorData?.errors) {
          const validationDetails = Object.entries(errorData.errors)
            .map(([field, msgs]) => `${field}: ${(msgs as string[]).join(", ")}`)
            .join("; ");
          throw new UOMApiError(
            `Validation failed - ${validationDetails}`,
            422,
            errorData
          );
        }
        throw new UOMApiError(
          serverMessage || "Invalid data provided.",
          422,
          errorData
        );
      }

      // Handle 400 Bad Request
      if (response.status === 400) {
        throw new UOMApiError(
          serverMessage || "Invalid request. Please check your input.",
          400,
          errorData
        );
      }

      // Handle 500 Server Error
      if (response.status >= 500) {
        const errorMsg = serverMessage 
          ? `Server error: ${serverMessage}` 
          : "Server error occurred. Please try again later or contact support if the problem persists.";
        throw new UOMApiError(
          errorMsg,
          response.status,
          errorData
        );
      }

      // Generic error for other status codes
      throw new UOMApiError(
        serverMessage || `Request failed with status ${response.status}`,
        response.status,
        errorData
      );
    }

    return response;
  } catch (err) {
    // Re-throw UOMApiError as-is
    if (err instanceof UOMApiError) {
      throw err;
    }

    // Network errors or other fetch failures
    if (err instanceof TypeError && err.message.includes("fetch")) {
      throw new UOMApiError(
        "Network error. Please check your internet connection and try again.",
        0
      );
    }

    // JSON parsing errors
    if (err instanceof SyntaxError) {
      throw new UOMApiError(
        "Invalid response from server. Please try again.",
        0
      );
    }

    // Unknown errors
    console.error("Unexpected error:", err);
    throw new UOMApiError(
      err instanceof Error ? err.message : "An unexpected error occurred.",
      0
    );
  }
}

async function getAll() {
  try {
    const response = await fetchWithErrorHandling(BASE_URL, {
      method: "GET",
    });
    return response.json();
  } catch (err) {
    if (err instanceof UOMApiError) {
      throw new UOMApiError(
        `Failed to load units of measurement - ${err.message}`,
        err.statusCode,
        err.details
      );
    }
    throw err;
  }
}

async function create(data: { name: string; symbol: string; description?: string }) {
  try {
    const response = await fetchWithErrorHandling(BASE_URL, {
      method: "POST",
      body: JSON.stringify(data),
    });
    return response.json();
  } catch (err) {
    if (err instanceof UOMApiError) {
      let contextMessage = "Failed to create unit of measurement";
      
      if (err.statusCode === 409) {
        if (err.message.toLowerCase().includes("symbol")) {
          contextMessage = `Cannot create unit of measurement - symbol '${data.symbol}' is already in use`;
        } else if (err.message.toLowerCase().includes("name")) {
          contextMessage = `Cannot create unit of measurement - name '${data.name}' is already in use`;
        } else {
          contextMessage = `Cannot create unit of measurement - '${data.name}' (${data.symbol}) already exists`;
        }
      } else if (err.statusCode === 422) {
        contextMessage = `Cannot create unit of measurement - ${err.message}`;
      } else if (err.statusCode === 400) {
        contextMessage = `Cannot create unit of measurement - ${err.message}`;
      } else {
        contextMessage = `Failed to create unit of measurement - ${err.message}`;
      }
      
      throw new UOMApiError(
        contextMessage,
        err.statusCode,
        err.details
      );
    }
    throw err;
  }
}

async function getById(id: string) {
  try {
    const response = await fetchWithErrorHandling(`${BASE_URL}/${id}`, {
      method: "GET",
    });
    return response.json();
  } catch (err) {
    if (err instanceof UOMApiError) {
      throw new UOMApiError(
        `Failed to load unit of measurement details - ${err.message}`,
        err.statusCode,
        err.details
      );
    }
    throw err;
  }
}

async function update(id: string, data: { name: string; symbol: string; description?: string }) {
  try {
    const response = await fetchWithErrorHandling(`${BASE_URL}/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    return response.json();
  } catch (err) {
    if (err instanceof UOMApiError) {
      let contextMessage = "Failed to update unit of measurement";
      
      if (err.statusCode === 404) {
        contextMessage = "Cannot update unit of measurement - unit not found (may have been deleted)";
      } else if (err.statusCode === 409) {
        if (err.message.toLowerCase().includes("symbol")) {
          contextMessage = `Cannot update unit of measurement - symbol '${data.symbol}' is already used by another unit`;
        } else if (err.message.toLowerCase().includes("name")) {
          contextMessage = `Cannot update unit of measurement - name '${data.name}' is already used by another unit`;
        } else {
          contextMessage = `Cannot update unit of measurement - '${data.name}' or '${data.symbol}' is already in use`;
        }
      } else if (err.statusCode === 422) {
        contextMessage = `Cannot update unit of measurement - ${err.message}`;
      } else if (err.statusCode === 400) {
        contextMessage = `Cannot update unit of measurement - ${err.message}`;
      } else {
        contextMessage = `Failed to update unit of measurement - ${err.message}`;
      }
      
      throw new UOMApiError(
        contextMessage,
        err.statusCode,
        err.details
      );
    }
    throw err;
  }
}

async function remove(id: string) {
  try {
    await fetchWithErrorHandling(`${BASE_URL}/${id}`, {
      method: "DELETE",
    });
    return true;
  } catch (err) {
    if (err instanceof UOMApiError) {
      let contextMessage = "Failed to delete unit of measurement";
      
      if (err.statusCode === 404) {
        contextMessage = "Cannot delete unit of measurement - unit not found (may have already been deleted)";
      } else if (err.statusCode === 409) {
        contextMessage = "Cannot delete unit of measurement - this unit is being used by products or items. Remove those associations first";
      } else {
        contextMessage = `Failed to delete unit of measurement - ${err.message}`;
      }
      
      throw new UOMApiError(
        contextMessage,
        err.statusCode,
        err.details
      );
    }
    throw err;
  }
}

export const uomApi = {
  getAll,
  create,
  getById,
  update,
  remove,
};