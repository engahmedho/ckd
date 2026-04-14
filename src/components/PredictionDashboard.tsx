import React from "react";
import { motion } from "motion/react";
import { PredictionResult } from "../types";
import { GlassCard } from "./GlassCard";
import { RiskGauge } from "./RiskGauge";
import { ShapBarChart } from "./ShapBarChart";
import { AlertCircle, CheckCircle2, Info, RefreshCw } from "lucide-react";

interface PredictionDashboardProps {
  result: PredictionResult;
  onReset: () => void;
}

export const PredictionDashboard: React.FC<PredictionDashboardProps> = ({ result, onReset }) => {
  const isCkd = result.diagnosis === "CKD Detected";

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Result Card */}
        <GlassCard className="lg:col-span-2 p-8 flex flex-col md:flex-row items-center gap-10">
          <RiskGauge percentage={result.probability * 100} />
          <div className="flex-1 space-y-4 text-center md:text-left">
            <div>
              <p className="text-xs text-white/40 uppercase tracking-[0.2em] mb-1">Clinical Assessment</p>
              <div className="flex items-center justify-center md:justify-start gap-3">
                {isCkd ? (
                  <AlertCircle className="text-red-400" size={32} />
                ) : (
                  <CheckCircle2 className="text-emerald-400" size={32} />
                )}
                <h2 className={`text-4xl font-bold ${isCkd ? 'text-red-400' : 'text-emerald-400'}`}>
                  {result.diagnosis}
                </h2>
              </div>
            </div>
            <p className="text-white/70 leading-relaxed text-lg italic">
              "{result.summary}"
            </p>
          </div>
        </GlassCard>

        {/* Action Card */}
        <GlassCard className="p-8 flex flex-col justify-center items-center text-center space-y-6">
          <div className="p-4 rounded-full bg-white/5 border border-white/10">
            <Info className="text-blue-400" size={32} />
          </div>
          <p className="text-white/60 text-sm">
            This prediction is based on an XGBoost classifier pipeline. Always consult with a medical professional for clinical decisions.
          </p>
          <button 
            onClick={onReset}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white transition-all"
          >
            <RefreshCw size={18} /> New Assessment
          </button>
        </GlassCard>
      </div>

      {/* XAI Section */}
      <GlassCard className="p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
            <Activity className="text-purple-400" size={20} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Explainable AI (XAI) Insights</h3>
            <p className="text-sm text-white/40">Feature importance based on SHAP values</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <ShapBarChart data={result.shapValues} />
          <div className="space-y-6">
            <h4 className="text-lg font-semibold text-white/80">Key Diagnostic Drivers</h4>
            <div className="space-y-4">
              {result.shapValues.slice(0, 3).map((shap, i) => (
                <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
                  <div className={`mt-1 w-2 h-2 rounded-full ${shap.impact === 'positive' ? 'bg-red-400' : 'bg-emerald-400'}`} />
                  <div>
                    <p className="text-white font-medium capitalize">{shap.feature.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-white/40">
                      {shap.impact === 'positive' 
                        ? "Significant contributor to positive CKD diagnosis." 
                        : "Strong indicator of healthy renal function."}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};

// Re-importing Activity because it was missing in the previous block but used here
import { Activity } from "lucide-react";
