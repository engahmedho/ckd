import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CKDInputs } from "../types";
import { GlassCard } from "./GlassCard";
import { ChevronRight, ChevronLeft, Activity, FlaskConical, ClipboardList } from "lucide-react";

interface MultiStepFormProps {
  onSubmit: (data: CKDInputs) => void;
  isLoading: boolean;
}

const initialData: CKDInputs = {
  age: 45, bp: 80, sg: 1.02, al: 0, su: 0,
  bgr: 121, bu: 36, sc: 1.2, sod: 138, pot: 4.4,
  hemo: 15.4, pcv: 44, wc: 7800, rc: 5.2,
  rbc: 'normal', pc: 'normal', pcc: 'notpresent', ba: 'notpresent',
  htn: 'no', dm: 'no', cad: 'no', appet: 'good', pe: 'no', ane: 'no'
};

export const MultiStepForm: React.FC<MultiStepFormProps> = ({ onSubmit, isLoading }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<CKDInputs>(initialData);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) : value
    }));
  };

  const nextStep = () => setStep(s => Math.min(s + 1, 3));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <Activity className="text-blue-400" />
              <h3 className="text-xl font-semibold text-white">Demographics & Vitals</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm text-white/60">Age (years)</label>
                <input 
                  type="number" name="age" value={formData.age} onChange={handleChange}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-white/60">Blood Pressure (mm/Hg)</label>
                <input 
                  type="number" name="bp" value={formData.bp} onChange={handleChange}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
            </div>
          </motion.div>
        );
      case 2:
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <FlaskConical className="text-purple-400" />
              <h3 className="text-xl font-semibold text-white">Laboratory Analysis</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Specific Gravity', name: 'sg', step: 0.005 },
                { label: 'Albumin', name: 'al', step: 1 },
                { label: 'Sugar', name: 'su', step: 1 },
                { label: 'Blood Glucose', name: 'bgr', step: 1 },
                { label: 'Blood Urea', name: 'bu', step: 1 },
                { label: 'Creatinine', name: 'sc', step: 0.1 },
                { label: 'Sodium', name: 'sod', step: 1 },
                { label: 'Potassium', name: 'pot', step: 0.1 },
                { label: 'Hemoglobin', name: 'hemo', step: 0.1 },
                { label: 'PCV', name: 'pcv', step: 1 },
                { label: 'WBC Count', name: 'wc', step: 100 },
                { label: 'RBC Count', name: 'rc', step: 0.1 },
              ].map((field) => (
                <div key={field.name} className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-white/40">{field.label}</label>
                  <input 
                    type="number" name={field.name} step={field.step} 
                    value={(formData as any)[field.name]} onChange={handleChange}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                  />
                </div>
              ))}
            </div>
          </motion.div>
        );
      case 3:
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <ClipboardList className="text-emerald-400" />
              <h3 className="text-xl font-semibold text-white">Medical History</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: 'Red Blood Cells', name: 'rbc', options: ['normal', 'abnormal'] },
                { label: 'Pus Cell', name: 'pc', options: ['normal', 'abnormal'] },
                { label: 'Pus Cell Clumps', name: 'pcc', options: ['present', 'notpresent'] },
                { label: 'Bacteria', name: 'ba', options: ['present', 'notpresent'] },
                { label: 'Hypertension', name: 'htn', options: ['yes', 'no'] },
                { label: 'Diabetes', name: 'dm', options: ['yes', 'no'] },
                { label: 'CAD', name: 'cad', options: ['yes', 'no'] },
                { label: 'Appetite', name: 'appet', options: ['good', 'poor'] },
                { label: 'Pedal Edema', name: 'pe', options: ['yes', 'no'] },
                { label: 'Anemia', name: 'ane', options: ['yes', 'no'] },
              ].map((field) => (
                <div key={field.name} className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-white/40">{field.label}</label>
                  <select 
                    name={field.name} value={(formData as any)[field.name]} onChange={handleChange}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/50 appearance-none"
                  >
                    {field.options.map(opt => <option key={opt} value={opt} className="bg-slate-900">{opt}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <GlassCard className="p-8">
      <div className="flex justify-between mb-8">
        {[1, 2, 3].map((s) => (
          <div 
            key={s} 
            className={`h-1 flex-1 mx-1 rounded-full transition-all duration-500 ${s <= step ? 'bg-blue-500' : 'bg-white/10'}`}
          />
        ))}
      </div>

      <div className="min-h-[300px]">
        <AnimatePresence mode="wait">
          {renderStep()}
        </AnimatePresence>
      </div>

      <div className="mt-8 flex justify-between">
        <button 
          onClick={prevStep}
          disabled={step === 1 || isLoading}
          className="flex items-center gap-2 px-6 py-2 rounded-xl text-white/60 hover:text-white disabled:opacity-30 transition-all"
        >
          <ChevronLeft size={20} /> Back
        </button>
        
        {step < 3 ? (
          <button 
            onClick={nextStep}
            className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-semibold transition-all shadow-lg shadow-blue-500/20"
          >
            Next <ChevronRight size={20} />
          </button>
        ) : (
          <button 
            onClick={() => onSubmit(formData)}
            disabled={isLoading}
            className="flex items-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white font-semibold transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
          >
            {isLoading ? "Analyzing..." : "Generate Prediction"}
          </button>
        )}
      </div>
    </GlassCard>
  );
};
