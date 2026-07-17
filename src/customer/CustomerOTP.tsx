import React, { useState, useRef, useEffect, KeyboardEvent, ClipboardEvent } from "react";
import { Loader2, CheckCircle2, ShieldCheck, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface CustomerOTPProps {
  mobileNumber: string;
  onVerify: () => void;
  customerName?: string;
  tableNumber?: string;
}

// --- Sub-Components ---

const CountdownTimer = ({ 
  timeLeft, 
  canResend, 
  onResend, 
  isResending 
}: { 
  timeLeft: number, 
  canResend: boolean, 
  onResend: () => void, 
  isResending: boolean 
}) => {
  return (
    <div className="text-center mt-6 h-8 flex items-center justify-center">
      {!canResend ? (
        <p className="text-sm text-[#A7B4AE] font-medium">
          OTP expires in <span className="text-[#D4A53A] font-bold">00:{timeLeft.toString().padStart(2, '0')}</span>
        </p>
      ) : (
        <button 
          onClick={onResend} 
          disabled={isResending}
          className="text-sm font-bold text-[#D4A53A] hover:text-[#e8b94f] transition-colors flex items-center gap-2 disabled:opacity-50"
          aria-label="Resend OTP"
        >
          {isResending && <Loader2 className="w-4 h-4 animate-spin" />}
          Resend OTP
        </button>
      )}
    </div>
  );
};

const VerifyButton = ({ 
  onClick, 
  disabled, 
  isVerifying 
}: { 
  onClick: () => void, 
  disabled: boolean, 
  isVerifying: boolean 
}) => {
  return (
    <button 
      onClick={onClick}
      disabled={disabled || isVerifying}
      aria-label="Verify OTP"
      className="w-full bg-[#0F8F5B] text-[#FFFFFF] hover:bg-[#12a66a] disabled:opacity-50 disabled:bg-[#1B3629] p-4 rounded-2xl text-[15px] font-bold transition-all shadow-lg shadow-[#0F8F5B]/20 flex items-center justify-center h-14 relative overflow-hidden group"
    >
      <span className="absolute inset-0 bg-[#FFFFFF]/20 opacity-0 group-active:opacity-100 transition-opacity"></span>
      {isVerifying ? (
        <Loader2 className="w-6 h-6 animate-spin" />
      ) : (
        "Verify OTP"
      )}
    </button>
  );
};

const ErrorToast = ({ message, onClose }: { message: string, onClose: () => void }) => {
  useEffect(() => {
    if (message) {
      const t = setTimeout(onClose, 6000);
      return () => clearTimeout(t);
    }
  }, [message, onClose]);

  return (
    <AnimatePresence>
      {message && (
        <motion.div 
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          className="absolute top-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-sm bg-[#0A241C] border border-[#EF4444]/40 p-4 rounded-2xl shadow-2xl shadow-[#EF4444]/10 flex items-start gap-4"
          role="alert"
        >
          <XCircle className="w-6 h-6 text-[#EF4444] shrink-0" />
          <div className="flex-1">
            <h4 className="text-[#FFFFFF] font-bold text-sm mb-1">❌ Invalid OTP</h4>
            <p className="text-[#A7B4AE] text-xs leading-relaxed whitespace-pre-line">{message}</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-[#A7B4AE] hover:text-[#FFFFFF] text-xs font-bold shrink-0 mt-1 focus:outline-none focus:ring-2 focus:ring-[#EF4444]/50 rounded"
            aria-label="Close error message"
          >
            Try Again
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const SuccessModal = ({ show }: { show: boolean }) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-50 bg-[#041A13]/90 backdrop-blur-md flex flex-col items-center justify-center rounded-[32px]"
          aria-live="polite"
        >
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", bounce: 0.5 }}
            className="w-20 h-20 bg-[#0F8F5B]/10 border border-[#0F8F5B]/30 rounded-full flex items-center justify-center mb-6 shadow-2xl shadow-[#0F8F5B]/20"
          >
            <motion.div
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <CheckCircle2 className="w-10 h-10 text-[#0F8F5B]" />
            </motion.div>
          </motion.div>
          <motion.h3 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-2xl font-black text-[#FFFFFF] mb-2 text-center px-4"
          >
            OTP Verified Successfully
          </motion.h3>
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-[#A7B4AE] text-sm"
          >
            Redirecting to dashboard...
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const OTPInput = ({ 
  otp, 
  setOtp, 
  disabled,
  error,
  onEnter 
}: { 
  otp: string[], 
  setOtp: (val: string[]) => void, 
  disabled: boolean,
  error: boolean,
  onEnter: () => void
}) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (inputRefs.current[0] && !disabled) {
      inputRefs.current[0].focus();
    }
  }, [disabled]);

  const handleChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value !== "" && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && otp[index] === "" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "Enter" && otp.join("").length === 4) {
      onEnter();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").slice(0, 4).replace(/\D/g, "");
    if (pasteData) {
      const newOtp = [...otp];
      for (let i = 0; i < pasteData.length; i++) {
        newOtp[i] = pasteData[i];
      }
      setOtp(newOtp);
      const focusIndex = Math.min(pasteData.length, 3);
      inputRefs.current[focusIndex]?.focus();
    }
  };

  return (
    <div className="flex justify-center gap-4 mb-8">
      {otp.map((digit, index) => (
        <input
          key={index}
          ref={el => { inputRefs.current[index] = el; }}
          type="text"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          className={`w-14 h-16 text-center text-[28px] font-bold rounded-2xl border focus:outline-none transition-all duration-300 disabled:opacity-50 ${
            error 
              ? "border-[#EF4444]/60 bg-[#EF4444]/5 text-[#EF4444] focus:ring-4 focus:ring-[#EF4444]/10 shadow-inner" 
              : "border-[#1B3629] bg-[#041A13] text-[#FFFFFF] focus:border-[#D4A53A] focus:ring-2 focus:ring-[#D4A53A]/30 shadow-inner"
          }`}
          aria-label={`OTP Digit ${index + 1}`}
          aria-invalid={error}
        />
      ))}
    </div>
  );
};

// --- Main Component ---

export default function CustomerOTP({ 
  mobileNumber, 
  onVerify,
  customerName = "Guest",
  tableNumber = "N/A"
}: CustomerOTPProps) {
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Timer State
  const [timeLeft, setTimeLeft] = useState(59);
  const [canResend, setCanResend] = useState(false);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (timeLeft > 0) {
      const timerId = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timerId);
    } else {
      setCanResend(true);
    }
  }, [timeLeft]);

  const handleResend = async () => {
    setIsResending(true);
    setErrorMsg("");
    setOtp(["", "", "", ""]); // Clear previous OTP
    
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: mobileNumber })
      });
      const data = await res.json();
      if (data.success) {
        setTimeLeft(59);
        setCanResend(false);
      } else {
        setErrorMsg("Unable to send OTP.\nPlease check your network and try again.");
      }
    } catch (err) {
      setErrorMsg("Connection Lost.\nPlease try again.");
    } finally {
      setIsResending(false);
    }
  };

  const handleVerify = async () => {
    const otpValue = otp.join("");
    if (otpValue.length === 4) {
      setIsVerifying(true);
      setErrorMsg("");
      try {
        const res = await fetch("/api/auth/verify-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: mobileNumber, otp: otpValue, name: customerName })
        });
        const data = await res.json();
        if (data.success) {
          if (data.token) {
            localStorage.setItem("customer_token", data.token);
          }
          setShowSuccess(true);
          setTimeout(() => {
            onVerify();
          }, 2000);
        } else {
          setErrorMsg("The OTP you entered is incorrect.\nPlease try again.");
          setOtp(["", "", "", ""]); // Clear on fail for UX
        }
      } catch (err) {
        setErrorMsg("Connection Lost.\nPlease try again.");
      } finally {
        setIsVerifying(false);
      }
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-[#041A13] relative overflow-hidden font-sans">
      <ErrorToast message={errorMsg} onClose={() => setErrorMsg("")} />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-[420px] bg-[#0A241C]/90 backdrop-blur-xl p-8 md:p-10 rounded-3xl shadow-[0_20px_50px_rgba(4,26,19,0.8)] border border-[#1B3629] relative"
      >
        <SuccessModal show={showSuccess} />

        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-[#041A13] border border-[#1B3629] rounded-2xl flex items-center justify-center mb-5 shadow-inner">
            <ShieldCheck className="w-8 h-8 text-[#D4A53A]" />
          </div>
          <h1 className="text-3xl font-black text-[#FFFFFF] tracking-tight mb-1">Spice Heaven</h1>
          <p className="text-[11px] text-[#A7B4AE] font-bold tracking-widest uppercase">Secure Verification</p>
        </div>

        {/* Customer Details */}
        <div className="bg-[#041A13] border border-[#1B3629] rounded-2xl p-4 flex justify-between items-center mb-8 shadow-inner">
          <div className="px-2">
            <p className="text-[10px] text-[#A7B4AE] uppercase tracking-wider font-bold mb-1">Name</p>
            <p className="text-sm text-[#FFFFFF] font-semibold truncate max-w-[80px]">{customerName}</p>
          </div>
          <div className="w-[1px] h-8 bg-[#1B3629]"></div>
          <div className="px-2">
            <p className="text-[10px] text-[#A7B4AE] uppercase tracking-wider font-bold mb-1">Phone</p>
            <p className="text-sm text-[#FFFFFF] font-semibold">{mobileNumber}</p>
          </div>
          <div className="w-[1px] h-8 bg-[#1B3629]"></div>
          <div className="text-right px-2">
            <p className="text-[10px] text-[#A7B4AE] uppercase tracking-wider font-bold mb-1">Table</p>
            <p className="text-sm text-[#D4A53A] font-bold">{tableNumber}</p>
          </div>
        </div>

        {/* OTP Section */}
        <div className="text-center mb-2">
          <p className="text-[13px] text-[#A7B4AE] mb-5">
            Enter the 4-digit OTP sent to <br/><span className="text-[#FFFFFF] font-bold tracking-wide mt-1 block">{mobileNumber}</span>
          </p>
          
          <OTPInput 
            otp={otp} 
            setOtp={setOtp} 
            disabled={isVerifying || showSuccess} 
            error={!!errorMsg}
            onEnter={handleVerify}
          />
        </div>

        <VerifyButton 
          onClick={handleVerify}
          disabled={otp.join("").length < 4}
          isVerifying={isVerifying}
        />

        <CountdownTimer 
          timeLeft={timeLeft} 
          canResend={canResend} 
          onResend={handleResend} 
          isResending={isResending} 
        />
      </motion.div>
    </div>
  );
}
