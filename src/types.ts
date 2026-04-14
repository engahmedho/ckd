export interface CKDInputs {
  // Numeric (14)
  age: number;
  bp: number;
  sg: number;
  al: number;
  su: number;
  bgr: number;
  bu: number;
  sc: number;
  sod: number;
  pot: number;
  hemo: number;
  pcv: number;
  wc: number;
  rc: number;

  // Categorical (10)
  rbc: 'normal' | 'abnormal';
  pc: 'normal' | 'abnormal';
  pcc: 'present' | 'notpresent';
  ba: 'present' | 'notpresent';
  htn: 'yes' | 'no';
  dm: 'yes' | 'no';
  cad: 'yes' | 'no';
  appet: 'good' | 'poor';
  pe: 'yes' | 'no';
  ane: 'yes' | 'no';
}

export interface ShapValue {
  feature: string;
  value: number;
  impact: 'positive' | 'negative';
}

export interface PredictionResult {
  diagnosis: 'Healthy' | 'CKD Detected';
  probability: number;
  shapValues: ShapValue[];
  summary: string;
}
