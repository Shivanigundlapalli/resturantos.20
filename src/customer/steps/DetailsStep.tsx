import React, { useState } from 'react';
import { motion } from 'motion/react';

interface DetailsStepProps {
  customerName: string;
  mobileNumber: string;
  tableNumber: string;
  setCustomerName: (name: string) => void;
  setMobileNumber: (phone: string) => void;
  setTableNumber: (table: string) => void;
  onNext: () => void;
}

export default function DetailsStep({
  customerName,
  mobileNumber,
  tableNumber,
  setCustomerName,
  setMobileNumber,
  setTableNumber,
  onNext
}: DetailsStepProps) {
  const [errors, setErrors] = useState<{name?: string; phone?: string; table?: string}>({});

  const validate = () => {
    let isValid = true;
    const newErrors: any = {};
    if (!customerName || customerName.trim().length < 3) {
      newErrors.name = "Name must be at least 3 characters.";
      isValid = false;
    }
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(mobileNumber)) {
      newErrors.phone = "Enter a valid 10-digit mobile number.";
      isValid = false;
    }
    const t = Number(tableNumber);
    if (!tableNumber || isNaN(t) || t < 1 || t > 50 || !Number.isInteger(t)) {
      newErrors.table = "Enter a valid table number (1-50).";
      isValid = false;
    }
    setErrors(newErrors);
    return isValid;
  };

  const handleContinue = () => {
    if (validate()) {
      onNext();
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }} 
      animate={{ opacity: 1, x: 0 }} 
      exit={{ opacity: 0, x: -20 }}
      className="w-full max-w-md mx-auto p-6 pt-10"
    >
      <h2 className="text-2xl font-black text-text-main mb-6 tracking-tight">Enter Details</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-sec mb-1">Full Name</label>
          <input 
            type="text" 
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full bg-warm-bg border border-warm-border text-text-main px-4 py-3 rounded-xl focus:outline-none focus:border-customer-primary focus:ring-1 focus:ring-amber-500 transition-all placeholder:text-zinc-600"
            placeholder="e.g. John Doe"
          />
          {errors.name && <p className="text-rose-500 text-xs mt-1 font-medium">{errors.name}</p>}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-text-sec mb-1">Mobile Number</label>
          <div className="flex">
            <span className="bg-warm-bg border border-r-0 border-warm-border text-text-sec px-4 py-3 rounded-l-xl flex items-center font-medium">+91</span>
            <input 
              type="tel" 
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
              maxLength={10}
              className="flex-1 bg-warm-bg border border-warm-border text-text-main px-4 py-3 rounded-r-xl focus:outline-none focus:border-customer-primary focus:ring-1 focus:ring-amber-500 transition-all placeholder:text-zinc-600 tracking-wider"
              placeholder="99999 99999"
            />
          </div>
          {errors.phone && <p className="text-rose-500 text-xs mt-1 font-medium">{errors.phone}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-text-sec mb-1">Table Number</label>
          <input 
            type="number" 
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
            className="w-full bg-warm-bg border border-warm-border text-text-main px-4 py-3 rounded-xl focus:outline-none focus:border-customer-primary focus:ring-1 focus:ring-amber-500 transition-all placeholder:text-zinc-600"
            placeholder="e.g. 5"
          />
          {errors.table && <p className="text-rose-500 text-xs mt-1 font-medium">{errors.table}</p>}
        </div>
      </div>

      <button 
        onClick={handleContinue}
        className="w-full mt-8 bg-customer-primary text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:bg-amber-400 transition-colors"
      >
        Continue
      </button>
    </motion.div>
  );
}
