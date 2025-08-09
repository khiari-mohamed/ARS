import { useAuth } from "./useAuth";

export function useRole(role: string) {
  // Replace with real role logic
  const { user } = useAuth();
  return user?.role === role;
}