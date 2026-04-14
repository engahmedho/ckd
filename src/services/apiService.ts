import { CKDInputs, PredictionResult } from "../types";

export async function predictCKD(inputs: CKDInputs): Promise<PredictionResult> {
  const token = sessionStorage.getItem('ckd_token');
  const response = await fetch("/api/predict", {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ inputs }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.details 
      ? `${errorData.error}: ${errorData.details}`
      : (errorData.error || "Prediction failed");
    throw new Error(message);
  }
  return response.json();
}

export async function getStats() {
  const token = sessionStorage.getItem('ckd_token');
  const response = await fetch("/api/stats", {
    headers: { 
      "Authorization": `Bearer ${token}`
    }
  });
  if (!response.ok) throw new Error("Failed to fetch stats");
  return response.json();
}
