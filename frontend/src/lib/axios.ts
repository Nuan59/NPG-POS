import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");

  console.log("🔑 TOKEN FROM LS:", token);
  console.log("➡️ BEFORE HEADER:", config.headers.Authorization);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  console.log("➡️ AFTER HEADER:", config.headers.Authorization);

  return config;
});

export default api;
