import { authStorage } from "@/lib/auth";

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

async function getHeaders(isFormData = false): Promise<HeadersInit> {
  const headers: Record<string, string> = isFormData ? {} : { 'Content-Type': 'application/json' };
  const token = authStorage.getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
  if (response.status === 401) {
    authStorage.clearAll();
    // In a real app, you might trigger a redirect or refresh token here
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.message || `Request failed with status ${response.status}`);
  }
  const data = await response.json();
  return { data, success: true };
}

/**
 * Performs a GET request.
 */
export async function mockGet<T>(url: string): Promise<ApiResponse<T>> {
  const response = await fetch(url, {
    headers: await getHeaders(),
  });
  return handleResponse<T>(response);
}

/**
 * Performs a POST request.
 */
export async function mockPost<T>(url: string, payload?: any): Promise<ApiResponse<T>> {
  const isFormData = payload instanceof FormData;
  const response = await fetch(url, {
    method: 'POST',
    headers: await getHeaders(isFormData),
    body: isFormData ? payload : (payload ? JSON.stringify(payload) : undefined),
  });
  return handleResponse<T>(response);
}

/**
 * Performs a PATCH request.
 */
export async function mockPatch<T>(url: string, payload?: any): Promise<ApiResponse<T>> {
  const isFormData = payload instanceof FormData;
  const response = await fetch(url, {
    method: 'PATCH',
    headers: await getHeaders(isFormData),
    body: isFormData ? payload : (payload ? JSON.stringify(payload) : undefined),
  });
  return handleResponse<T>(response);
}

/**
 * Performs a PUT request.
 */
export async function mockPut<T>(url: string, payload?: any): Promise<ApiResponse<T>> {
  const isFormData = payload instanceof FormData;
  const response = await fetch(url, {
    method: 'PUT',
    headers: await getHeaders(isFormData),
    body: isFormData ? payload : (payload ? JSON.stringify(payload) : undefined),
  });
  return handleResponse<T>(response);
}

/**
 * Performs a DELETE request.
 */
export async function mockDelete(url: string): Promise<ApiResponse<null>> {
  const response = await fetch(url, {
    method: 'DELETE',
    headers: await getHeaders(),
  });
  return handleResponse<null>(response);
}

/**
 * Performs a login request using OAuth2 password flow.
 */
export async function loginRequest(url: string, payload: any): Promise<ApiResponse<any>> {
  const formData = new URLSearchParams();
  formData.append('username', payload.email);
  formData.append('password', payload.password);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });
  return handleResponse<any>(response);
}
