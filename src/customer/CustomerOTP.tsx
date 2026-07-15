import React, { useState, useRef, useEffect } from "react";
import { ShieldCheck, ArrowRight, Loader2 } from "lucide-react";
import { motion } from "motion/react";

interface CustomerOTPProps {
  mobileNumber: string;
  onVerify: () => void;
}

export default function CustomerOTP({ mobileNumber, onVerify }: CustomerOTPProps) {
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError(false);

    // Move to next input
    if (value !== "" && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && otp[index] === "" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = () => {
    const otpValue = otp.join("");
    if (otpValue.length === 4) {
      setIsVerifying(true);
      // Simulate network validation
      setTimeout(() => {
        if (otpValue === "1234") {
          onVerify();
        } else {
          setError(true);
          setIsVerifying(false);
        }
      }, 800);
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-zinc-50 relative">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm bg-white p-8 rounded-3xl shadow-xl border border-zinc-100 text-center"
      >
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldCheck className="w-8 h-8" />
        </div>

        <h2 className="text-2xl font-black text-zinc-900 tracking-tight mb-2">Verify Mobile</h2>
        <p className="text-sm text-zinc-500 mb-8">
          We've sent a code to <span className="font-bold text-zinc-800">{mobileNumber}</span>
          <br/><span className="text-[10px] text-zinc-400">(Use 1234 for testing)</span>
        </p>

        <div className="flex justify-center gap-3 mb-6">
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={el => { inputRefs.current[index] = el; }}
              type="text"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className={`w-14 h-14 text-center text-2xl font-bold rounded-xl border-2 focus:outline-none transition-all ${
                error 
                  ? "border-red-300 bg-red-50 text-red-600" 
                  : "border-zinc-200 bg-zinc-50 text-zinc-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-xs text-red-500 font-bold mb-4 animate-pulse">Invalid OTP. Please try 1234.</p>
        )}

        <button 
          onClick={handleVerify}
          disabled={isVerifying || otp.join("").length < 4}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white p-4 rounded-xl text-sm font-bold transition-all shadow-md flex items-center justify-center gap-2"
        >
          {isVerifying ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              Verify & Proceed <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        <p className="text-xs text-zinc-400 mt-6 font-medium">
          Didn't receive the code? <button className="text-blue-600 font-bold">Resend</button>
        </p>
      </motion.div>
    </div>
  );
}
