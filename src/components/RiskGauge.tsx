import React from "react";
import { motion } from "motion/react";

interface RiskGaugeProps {
  percentage: number;
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({ percentage }) => {
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  const getColor = (p: number) => {
    if (p < 30) return "#4ade80"; // Green
    if (p < 70) return "#fbbf24"; // Yellow
    return "#f87171"; // Red
  };

  return (
    <div className="relative flex items-center justify-center w-48 h-48">
      <svg className="w-full h-full transform -rotate-90">
        {/* Background Circle */}
        <circle
          cx="96"
          cy="96"
          r={radius}
          stroke="currentColor"
          strokeWidth="12"
          fill="transparent"
          className="text-white/10"
        />
        {/* Progress Circle */}
        <motion.circle
          cx="96"
          cy="96"
          r={radius}
          stroke={getColor(percentage)}
          strokeWidth="12"
          fill="transparent"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold text-white">{Math.round(percentage)}%</span>
        <span className="text-xs text-white/60 uppercase tracking-widest">Risk Level</span>
      </div>
    </div>
  );
};
