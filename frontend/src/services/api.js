// Configuração e funções compartilhadas da API do Memória Viva.
// No Snack, substitua por uma URL HTTPS pública do backend se necessário.
const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  "https://3000-illevww4j4vkivja68mfa-cc500f3b.us1.manus.computer";
export const COLORS = {
  ink: "#18383c",
  teal: "#0b4f59",
  dark: "#073b43",
  paper: "#f7f5ef",
  card: "#fffdf8",
  muted: "#758580",
  line: "#e2e6de",
  terracotta: "#c8785f",
  sage: "#e5efe9",
  peach: "#f3e3d8",
  white: "#ffffff",
  danger: "#a45140",
};

export const api = async (path, token, options = {}) => {
  const isForm = options.body instanceof FormData;
  const headers = {
    ...(isForm ? {} : { "Content-Type": "application/json" }),
    ...(options.headers || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data =
    response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(
      data?.error?.message || "Não foi possível concluir a operação.",
    );
  return data;
};

export const initials = (name = "") => {
  if (typeof name !== "string" || !name.trim()) return "?";

  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
};

export const formatDate = (date) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date.slice(0, 10)}T12:00:00`));
export const assetUrl = (url) =>
  url?.startsWith("http") ? url : `${API_URL}${url || ""}`;
