import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Loader2 } from 'lucide-react';

interface OtpStepProps {
  customerName: string;
  mobileNumber: string;
  onNext: () => void;
  onBack: () => void;
}

export default function OtpStep({ customerName, mobileNumber, onNext, onBack }: OtpStepProps) {
  const [otpInput, setOtpInput] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSending, setIsSending] = useState(true);
  const hasSentOTP = useRef(false);

  useEffect(() => {
    if (!hasSentOTP.current) {
      hasSentOTP.current = true;
      handleSendOTP();
    }
  }, []);

  const handleSendOTP = async () => {
    setIsSending(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: `+91 ${mobileNumber}` })
      });
      
      const data = await res.json();
      if (data.success) {
        if (data.demoOtp) {
          console.log(`Demo OTP for ${mobileNumber}: ${data.demoOtp}`);
          alert(`Demo Mode Active. Your OTP is: ${data.demoOtp}`);
        }
      } else {
        alert("Failed to send OTP: " + data.message);
      }
    } catch (err) {
      alert("Network error sending OTP.");
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otpInput.length !== 6) return;
    setIsVerifying(true);

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: `+91 ${mobileNumber}`, otp: otpInput, name: customerName })
      });
      
      const data = await res.json();
      if (data.success) {
        onNext();
      } else {
        alert("Invalid OTP!");
        setOtpInput("");
      }
    } catch (err) {
      alert("Network error verifying OTP.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }} 
      animate={{ opacity: 1, x: 0 }} 
      exit={{ opacity: 0, x: -20 }}
      className="w-full max-w-md mx-auto p-6 pt-10"
    >
      <h2 className="text-2xl font-black text-text-main mb-2 tracking-tight">Verify OTP</h2>
      <p className="text-text-sec text-sm mb-6">
        We've sent a 6-digit code to <span className="font-bold text-text-main">+91 {mobileNumber}</span>.
      </p>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-text-sec mb-2">Enter OTP</label>
          <input 
            type="text" 
            value={otpInput}
            onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
            disabled={isSending || isVerifying}
            className="w-full bg-warm-bg border border-warm-border text-text-main px-4 py-4 rounded-xl focus:outline-none focus:border-customer-primary focus:ring-1 focus:ring-amber-500 transition-all text-center tracking-[0.5em] text-2xl font-black placeholder:text-zinc-700"
            placeholder="••••••"
          />
        </div>

        <button 
          onClick={handleVerifyOTP}
          disabled={otpInput.length !== 6 || isVerifying || isSending}
          className="w-full bg-customer-primary disabled:bg-warm-card disabled:text-text-muted text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.3)] disabled:shadow-none hover:bg-amber-400 transition-colors flex items-center justify-center"
        >
          {isVerifying ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify OTP"}
        </button>

        <div className="flex flex-col gap-3 mt-4">
          <button 
            onClick={handleSendOTP}
            disabled={isSending || isVerifying}
            className="w-full text-text-sec text-sm font-medium py-2 hover:text-text-main transition-colors"
          >
            {isSending ? "Sending..." : "Resend OTP"}
          </button>
          
          <button 
            onClick={onBack}
            disabled={isSending || isVerifying}
            className="w-full text-text-muted text-xs font-medium hover:text-text-sec transition-colors"
          >
            Edit Mobile Number
          </button>
        </div>
      </div>
    </motion.div>
  );
}
