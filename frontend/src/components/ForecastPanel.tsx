import React from "react";
import { ForecastResult, StaffingEstimation } from "../types/bordereaux";

interface Props {
  forecast?: ForecastResult | null;
  staffing?: StaffingEstimation | null;
}

const ForecastPanel: React.FC<Props> = ({ forecast, staffing }) => (
  <div className="forecast-panel mt-8">
    <h2>Prévisions</h2>
    {forecast ? (
      <div>
        <div>Prévision (7 jours): <b>{forecast.forecast}</b></div>
        <div>Moyenne journalière: <b>{forecast.dailyAverage}</b></div>
      </div>
    ) : (
      <div className="text-gray-500">Aucune prévision disponible.</div>
    )}
    {staffing && (
      <div>
        <div>Effectif estimé requis: <b>{staffing.staffNeeded}</b> (pour {staffing.forecast} bordereaux)</div>
      </div>
    )}
  </div>
);

export default ForecastPanel;