// JWT Authentication helpers

const TOKEN_KEY = "auth_token"
const USER_KEY = "auth_user"

export type UserRole = "superAdmin" | "admin" | "user"

export interface AuthUser {
  id: string
  username: string
  role: UserRole
  createdAt: string
  updatedAt: string
}

export function setAuthToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(TOKEN_KEY, token)
  }
}

export function getAuthToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem(TOKEN_KEY)
  }
  return null
}

export function removeAuthToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }
}

export function setAuthUser(user: AuthUser): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  }
}

export function getAuthUser(): AuthUser | null {
  if (typeof window !== "undefined") {
    const userStr = localStorage.getItem(USER_KEY)
    if (userStr) {
      try {
        return JSON.parse(userStr) as AuthUser
      } catch {
        return null
      }
    }
  }
  return null
}

export function getUserRole(): UserRole | null {
  const user = getAuthUser()
  return user?.role || null
}

export function isAuthenticated(): boolean {
  return !!getAuthToken()
}

export function hasRole(...roles: UserRole[]): boolean {
  const userRole = getUserRole()
  return userRole ? roles.includes(userRole) : false
}

// Check if user is superAdmin
export function isSuperAdmin(): boolean {
  return hasRole("superAdmin")
}

// Check if user is admin or superAdmin
export function isAdmin(): boolean {
  return hasRole("admin", "superAdmin")
}

// API base URL - adjust based on your environment
// Note: Next.js requires NEXT_PUBLIC_ prefix for client-side env vars
// Force absolute URL - never use relative paths
const getApiUrl = (): string => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL
  if (envUrl && (envUrl.startsWith('http://') || envUrl.startsWith('https://'))) {
    return envUrl.trim().replace(/\/+$/, "")
  }
  // Default fallback - MUST be absolute
  return "http://localhost:4000/api/v1"
}

export async function login(username: string, password: string): Promise<{ token: string; user: AuthUser }> {
  // HARDCODE absolute URL to prevent any relative path issues
  // This ensures we ALWAYS call the correct API endpoint
  const fullUrl = "http://localhost:4000/api/v1/auth/login"
  
  console.log("🔐 Attempting login:", { 
    fullUrl,
    username,
    envVar: process.env.NEXT_PUBLIC_API_URL,
    windowOrigin: typeof window !== "undefined" ? window.location.origin : "N/A",
    isAbsolute: fullUrl.startsWith('http'),
    urlType: typeof fullUrl
  })
  
  // Validate URL is absolute
  if (!fullUrl.match(/^https?:\/\//)) {
    throw new Error(`Invalid API URL: ${fullUrl}. Must be an absolute URL starting with http:// or https://`)
  }
  
  try {
    // Explicitly create a new URL object to ensure it's valid
    const urlObj = new URL(fullUrl)
    console.log("🌐 URL object created:", {
      href: urlObj.href,
      origin: urlObj.origin,
      pathname: urlObj.pathname,
      host: urlObj.host
    })
    
    const response = await fetch(urlObj.href, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // Include credentials for CORS
      body: JSON.stringify({ username: username.trim().toLowerCase(), password }),
    })

    console.log("📡 Response received:", {
      status: response.status,
      statusText: response.statusText,
      url: response.url, // This shows the final URL after redirects
      redirected: response.redirected,
      type: response.type
    })
    
    // Check if we got redirected (shouldn't happen with absolute URL)
    if (response.url !== fullUrl && !response.url.includes('localhost:4000')) {
      console.error("⚠️ WARNING: Request was redirected to:", response.url)
      console.error("Expected URL:", fullUrl)
      throw new Error(`Request was redirected. Expected API at localhost:4000 but got: ${response.url}`)
    }
    
    // Clone response to read it multiple times if needed
    const responseClone = response.clone()

    // Get response text first to debug
    const responseText = await responseClone.text()
    console.log("📄 Response body (raw, first 200 chars):", responseText.substring(0, 200))
    
    if (!response.ok) {
      let errorMessage = "Login failed"
      const contentType = response.headers.get("content-type")
      
      console.error("❌ Response not OK:", {
        status: response.status,
        statusText: response.statusText,
        contentType,
        url: response.url,
        bodyPreview: responseText.substring(0, 100)
      })
      
      try {
        if (contentType && contentType.includes("application/json")) {
          const error = JSON.parse(responseText)
          errorMessage = error.message || errorMessage
          console.error("❌ API Error (JSON):", error)
        } else {
          // Try to parse as JSON anyway
          try {
            const parsed = JSON.parse(responseText)
            errorMessage = parsed.message || errorMessage
            console.error("❌ API Error (parsed from text):", parsed)
          } catch {
            // Not JSON, use text as-is
            errorMessage = responseText || "Invalid username or password"
            console.error("❌ API Error (plain text):", responseText)
          }
        }
      } catch (err) {
        console.error("❌ Error parsing response:", err)
        errorMessage = `Login failed (Status: ${response.status})`
      }
      throw new Error(errorMessage)
    }

    const data = JSON.parse(responseText)
    console.log("✅ Login successful:", { hasToken: !!data.token, hasUser: !!data.user })
    
    if (!data.token || !data.user) {
      console.error("❌ Invalid response structure:", data)
      throw new Error("Invalid response from server")
    }

    return {
      token: data.token,
      user: data.user,
    }
  } catch (error: any) {
    console.error("❌ Login error:", error)
    // Handle network errors
    if (error.name === "TypeError" && error.message.includes("fetch")) {
      throw new Error(`Cannot connect to server at ${fullUrl}. Please check if the API is running on port 4000.`)
    }
    throw error
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = getAuthToken()
  if (!token) return null

  try {
    const response = await fetch("http://localhost:4000/api/v1/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    return data.user
  } catch {
    return null
  }
}

export async function logout(): Promise<void> {
  const token = getAuthToken()
  if (token) {
    try {
      await fetch("http://localhost:4000/api/v1/auth/logout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
    } catch {
      // Ignore errors on logout
    }
  }
  removeAuthToken()
}
