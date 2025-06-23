import { UseAuth } from "./useAuth";

export function useRole(role: string) {
  // Replace with real role logic
  const { user } = UseAuth();
  return user.role === role;
}