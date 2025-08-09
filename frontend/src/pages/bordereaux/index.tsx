import { useAuth } from '../../hooks/useAuth';
import BordereauxListPage from "./BordereauxList";

export default function BordereauxIndexPage() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <div className="text-center py-10 text-gray-500">Authentification requise.</div>;
  }

  // The BordereauxListPage is now fully role-aware and secure
  return <BordereauxListPage />;
}
