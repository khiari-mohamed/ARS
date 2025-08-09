import { Alert } from "../types/bordereaux";

export default function AlertBanner({ alerts }: { alerts: Alert[] }) {
  if (!alerts?.length) return null;
  return (
    <div className="mb-4">
      {alerts.map(alert => (
        <div
          key={alert.id}
          className="bg-red-100 border-l-4 border-red-500 text-red-700 p-2 mb-2 rounded"
        >
          <strong>⚠️ {alert.type}:</strong> <span>{alert.message}</span>
        </div>
      ))}
    </div>
  );
}