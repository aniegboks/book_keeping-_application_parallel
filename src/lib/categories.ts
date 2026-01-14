// lib/categories.ts

export interface Category {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCategoryData {
  name: string;
}

const BASE_URL = "/api/proxy/categories";

// Define error response structure
interface ApiErrorResponse {
  message?: string;
  error?: string;
  details?: unknown;
}

// Enhanced error class with user-friendly messages
class CategoryApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'CategoryApiError';
  }
}

// Parse API error responses and return user-friendly messages
function parseApiError(error: Error | CategoryApiError | { message?: string }, statusCode?: number): string {
  // Network errors
  if (typeof window !== 'undefined' && !navigator.onLine) {
    return "No internet connection. Please check your network and try again.";
  }

  // Handle fetch errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return "Unable to connect to the server. Please check your connection and try again.";
  }

  // Handle timeout errors
  if (error.message === 'AbortError' || error.message?.includes('timeout')) {
    return "Request timed out. Please try again.";
  }

  // Parse response errors based on status code
  if (statusCode === 400) {
    return error.message || "Invalid request. Please check your input and try again.";
  }
  
  if (statusCode === 401) {
    return "Your session has expired. Redirecting to login...";
  }
  
  if (statusCode === 403) {
    return "You don't have permission to perform this action.";
  }
  
  if (statusCode === 404) {
    return "Category not found. It may have been deleted.";
  }
  
  if (statusCode === 409) {
    return error.message || "A category with this name already exists. Please use a different name.";
  }
  
  if (statusCode === 422) {
    return error.message || "Invalid data provided. Please check your input.";
  }
  
  if (statusCode === 429) {
    return "Too many requests. Please wait a moment and try again.";
  }
  
  if (statusCode && statusCode >= 500) {
    return "Server error. Our team has been notified. Please try again later.";
  }

  // Return specific error message if available and user-friendly
  if (error.message && 
      !error.message.includes('Internal') && 
      !error.message.includes('Server Error') &&
      !error.message.includes('Failed to fetch')) {
    return error.message;
  }

  // Default fallback
  return "Something went wrong. Please try again or contact support if the issue persists.";
}

// Validate category data before sending
function validateCategoryData(data: CreateCategoryData | Partial<CreateCategoryData>): void {
  if ('name' in data) {
    const name = data.name?.trim();
    
    if (!name) {
      throw new CategoryApiError("Category name is required and cannot be empty.", 400);
    }
    
    if (name.length < 2) {
      throw new CategoryApiError("Category name must be at least 2 characters long.", 400);
    }
    
    if (name.length > 100) {
      throw new CategoryApiError("Category name cannot exceed 100 characters.", 400);
    }

    // Check for invalid characters
    const invalidChars = /[<>]/;
    if (invalidChars.test(name)) {
      throw new CategoryApiError("Category name contains invalid characters.", 400);
    }
  }
}

// --- Universal fetch proxy helper with enhanced error handling ---
async function fetchProxy(url: string, options: RequestInit = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    if (!response.ok) {
      let errorData: ApiErrorResponse | null = null;
      let errorMessage = '';

      try {
        errorData = await response.json() as ApiErrorResponse;
        errorMessage = errorData?.message || errorData?.error || '';
      } catch {
        // If parsing fails, use status text
        errorMessage = response.statusText;
      }

      // Handle auth issues
      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          window.location.href = "/login";
        }
        throw new CategoryApiError(
          "Your session has expired. Redirecting to login...",
          401,
          errorData
        );
      }

      // Create detailed error with user-friendly message
      const userFriendlyMessage = parseApiError(
        { message: errorMessage }, 
        response.status
      );

      throw new CategoryApiError(
        userFriendlyMessage,
        response.status,
        errorData
      );
    }

    // Handle no content
    if (response.status === 204) return null;

    return response.json();
  } catch (err) {
    console.error("Categories API Fetch failed:", {
      url,
      method: options.method || 'GET',
      error: err,
      timestamp: new Date().toISOString()
    });

    // Re-throw CategoryApiError as-is
    if (err instanceof CategoryApiError) {
      throw err;
    }

    // Wrap other errors with user-friendly message
    const error = err as Error;
    throw new CategoryApiError(
      parseApiError(error, undefined),
      undefined,
      err
    );
  }
}

// --- CRUD methods ---
export const categoriesApi = {
  /**
   * Get all categories
   */
  async getAll(): Promise<Category[]> {
    try {
      return await fetchProxy(BASE_URL);
    } catch (error) {
      throw error; // Error already has user-friendly message
    }
  },

  /**
   * Get category by ID
   */
  async getById(id: string): Promise<Category> {
    try {
      if (!id || !id.trim()) {
        throw new CategoryApiError("Category ID is required.", 400);
      }

      const url = `${BASE_URL}/${id}`;
      return await fetchProxy(url);
    } catch (error) {
      throw error;
    }
  },

  /**
   * Create new category
   */
  async create(data: CreateCategoryData): Promise<Category> {
    try {
      // Validate data before sending
      validateCategoryData(data);

      return await fetchProxy(BASE_URL, {
        method: "POST",
        body: JSON.stringify({ name: data.name.trim() }),
      });
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update category
   */
  async update(id: string, data: Partial<CreateCategoryData>): Promise<Category> {
    try {
      if (!id || !id.trim()) {
        throw new CategoryApiError("Category ID is required for updates.", 400);
      }

      // Validate data before sending
      if (data.name !== undefined) {
        validateCategoryData(data as CreateCategoryData);
      }

      const url = `${BASE_URL}/${id}`;
      return await fetchProxy(url, {
        method: "PUT",
        body: JSON.stringify(data.name ? { name: data.name.trim() } : data),
      });
    } catch (error) {
      throw error;
    }
  },

  /**
   * Delete category
   */
  async delete(id: string): Promise<void> {
    try {
      if (!id || !id.trim()) {
        throw new CategoryApiError("Category ID is required for deletion.", 400);
      }

      const url = `${BASE_URL}/${id}`;
      await fetchProxy(url, { method: "DELETE" });
    } catch (error) {
      throw error;
    }
  },
} as const;