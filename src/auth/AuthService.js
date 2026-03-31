const API_URL = "http://localhost:8080/api/auth";

// LOGIN
export const login = async (userData) => {
  const response = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(userData),
  });

  if (!response.ok) {
    throw new Error("Invalid credentials");
  }

  const data = await response.json();

  // Store all fields needed across the app
  localStorage.setItem("token", data.token);
  localStorage.setItem("role", data.role);
  localStorage.setItem("username", data.username);
  localStorage.setItem("mustResetPassword", data.mustResetPassword);

  return data;
};

// LOGOUT
export const logout = async () => {
  const token = getToken();

  if (token) {
    try {
      await fetch(`${API_URL}/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (err) {
      console.error("Logout error:", err);
    }
  }

  // Clear everything from localStorage
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  localStorage.removeItem("username");
  localStorage.removeItem("mustResetPassword");
};

// HELPERS
export const getToken = () => localStorage.getItem("token");
export const getRole = () => localStorage.getItem("role");
export const getUsername = () => localStorage.getItem("username");
export const isAuthenticated = () => !!getToken();
export const isAdmin = () => getRole() === "ADMIN";