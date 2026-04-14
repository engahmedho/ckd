import { CKDInputs, PredictionResult } from "../types";

export async function predictCKD(inputs: CKDInputs, userId: string): Promise<PredictionResult> {
  const response = await fetch("/api/predict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ inputs, userId }),
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
  const response = await fetch("/api/stats");
  if (!response.ok) throw new Error("Failed to fetch stats");
  return response.json();
}
