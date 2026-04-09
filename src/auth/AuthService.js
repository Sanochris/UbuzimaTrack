const API_URL = "http://localhost:8080/api/auth";

// 🔐 LOGIN
export const login = async (user) => {
  const response = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(user),
  });

  if (!response.ok) {
    throw new Error("Invalid credentials");
  }

  const data = await response.json();

  // ✅ STORE EVERYTHING
  localStorage.setItem("token", data.token);
  localStorage.setItem("role", data.role);
  localStorage.setItem("username", data.username);
  localStorage.setItem(
    "mustResetPassword",
    data.mustResetPassword
  );

  return data;
};

// 🔓 LOGOUT
export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  localStorage.removeItem("username");
  localStorage.removeItem("mustResetPassword");
};

// 📌 HELPERS
export const getToken = () => localStorage.getItem("token");
export const getRole = () => localStorage.getItem("role");
export const getUsername = () => localStorage.getItem("username");

export const isAuthenticated = () => {
  return !!localStorage.getItem("token");
};