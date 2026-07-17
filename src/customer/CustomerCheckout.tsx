import React, { useState, useEffect } from "react";
import { ArrowLeft, Receipt, Loader2, CreditCard, Banknote } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { CartItem } from "./CustomerApp";
import { loadRazorpayScript } from "../lib/razorpay";

interface CustomerCheckoutProps {
  cart: CartItem[];
  customerName: string;
  mobileNumber: string;
  tableNumber: string;
  setCustomerName: (name: string) => void;
  setMobileNumber: (mobile: string) => void;
  onConfirm: (orderId: string) => void;
  onBack: () => void;
}

export default function CustomerCheckout({ 
  cart, 
  customerName, 
  mobileNumber, 
  tableNumber,
  setCustomerName,
  setMobileNumber,
  onConfirm, 
  onBack 
}: CustomerCheckoutProps) {
  
  const [step, setStep] = useState<1 | 2 | 3>(customerName && mobileNumber ? 2 : 1);
  
  // Form State
  const [localName, setLocalName] = useState(customerName);
  const [localPhone, setLocalPhone] = useState(mobileNumber);
  const [localTable, setLocalTable] = useState(tableNumber);
  const [generalInstructions, setGeneralInstructions] = useState("");
  
  // Validation Errors
  const [errors, setErrors] = useState<{name?: string, phone?: string, table?: string}>({});
  
  // OTP State
  const [otpSent, setOtpSent] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<"ONLINE" | "CASH">("ONLINE");
  const [isPlacing, setIsPlacing] = useState(false);
  
  // Confirmation Dialog
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Auto-capitalize First Letters
  useEffect(() => {
    if (localName) {
      const formatted = localName
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
      if (formatted !== localName) {
        setLocalName(formatted);
      }
    }
  }, [localName]);

  const validateForm = () => {
    let isValid = true;
    const newErrors: any = {};
    
    // Name validation: 3-40 chars, alpha + spaces only
    const nameRegex = /^[a-zA-Z\s]{3,40}$/;
    if (!localName || localName.trim().length < 3) {
      newErrors.name = "Name must be at least 3 characters.";
      isValid = false;
    } else if (!nameRegex.test(localName)) {
      newErrors.name = "Only alphabets and spaces are allowed.";
      isValid = false;
    }

    // Phone validation: exactly 10 digits
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(localPhone)) {
      newErrors.phone = "Enter a valid 10-digit mobile number.";
      isValid = false;
    }

    // Table validation: 1 to 10
    if (!localTable || isNaN(Number(localTable)) || Number(localTable) < 1 || Number(localTable) > 10 || !Number.isInteger(Number(localTable))) {
      newErrors.table = "Table number must be an integer between 1 and 10.";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSendOTP = async () => {
    if (!validateForm()) return;
    setIsVerifying(true);
    
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: `+91 ${localPhone}` })
      });
      
      const data = await res.json();
      if (data.success) {
        setOtpSent(true);
        // Toast notification simulation for Dev Mode
        console.log("DEV OTP:", data.dev_otp);
      } else {
        alert("Failed to send OTP: " + data.error);
      }
    } catch (err) {
      alert("Network error sending OTP");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otpInput.length !== 4) return;
    setIsVerifying(true);

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: `+91 ${localPhone}`, otp: otpInput })
      });
      
      const data = await res.json();
      if (data.success) {
        setCustomerName(localName);
        setMobileNumber(localPhone);
        setStep(2);
      } else {
        alert("Invalid OTP!");
      }
    } catch (err) {
      alert("Network error verifying OTP");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleProceedToPayment = () => {
    setShowConfirmDialog(true);
  };

  const confirmOrderProceed = () => {
    setShowConfirmDialog(false);
    if (paymentMethod === "CASH") {
      submitOrder("NOT PAID");
    } else {
      initiateRazorpay();
    }
  };

  const submitOrder = async (payStatus: string) => {
    setIsPlacing(true);
    
    // Combine Special Instructions
    const itemInstructions = cart.map(item => {
      const custs = item.customizations;
      if (!custs || Object.keys(custs).length === 0) return null;
      const parts = Object.entries(custs).filter(([_,v]) => v).map(([_,v]) => v).join(", ");
      return parts ? `${item.name} (${item.cartQuantity}x): ${parts}` : null;
    }).filter(Boolean).join(" | ");

    let finalInstructions = itemInstructions;
    if (generalInstructions.trim()) {
      finalInstructions = finalInstructions 
        ? `${finalInstructions} || General: ${generalInstructions.trim()}`
        : `General: ${generalInstructions.trim()}`;
    }

    const orderData = {
      customerName: localName.trim(),
      phone: `+91 ${localPhone}`,
      tableOrType: `Table ${localTable}`,
      items: cart.map(item => ({
        menuItemId: item.id,
        name: item.name,
        quantity: item.cartQuantity,
        price: item.price + (item.customizations?.cheese ? 30 : 0) + (item.customizations?.butter ? 20 : 0)
      })),
      status: "Pending",
      payment_method: paymentMethod,
      payment_status: payStatus,
      estimated_prep_time: prepTime,
      special_instructions: finalInstructions
    };

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData)
      });
      
      if (response.ok) {
        const result = await response.json();
        onConfirm(result.id);
      } else {
        const errData = await response.json().catch(() => null);
        alert(errData?.error || "Failed to place order. Check validation.");
      }
    } catch (err) {
      console.error(err);
      alert("Network error.");
    } finally {
      setIsPlacing(false);
    }
  };

  const initiateRazorpay = async () => {
    setIsPlacing(true);
    const isLoaded = await loadRazorpayScript();
    if (!isLoaded) {
      alert("Razorpay SDK failed to load. Are you online?");
      setIsPlacing(false);
      return;
    }
    
    const options = {
      key: (import.meta as any).env.VITE_RAZORPAY_KEY_ID || "rzp_test_TDlNGuvutaLf6K", 
      amount: Math.round(grandTotal * 100), // paise
      currency: "INR",
      name: "Spice Heaven",
      description: "Order Payment",
      handler: async function (response: any) {
        await submitOrder("PAID");
      },
      prefill: {
        name: localName,
        contact: localPhone
      },
      theme: {
        color: "#0F8F5B"
      },
      modal: {
        ondismiss: function() {
          setIsPlacing(false);
        }
      }
    };
    
    const paymentObject = new (window as any).Razorpay(options);
    paymentObject.open();
  };

  const subtotal = cart.reduce((sum, item) => {
    const itemPrice = item.price + (item.customizations?.cheese ? 30 : 0) + (item.customizations?.butter ? 20 : 0);
    return sum + (itemPrice * item.cartQuantity);
  }, 0);
  const gst = subtotal * 0.05;
  const grandTotal = subtotal + gst;
  const prepTime = Math.max(15, cart.length * 3);

  return (
    <div className="w-full h-full flex flex-col bg-[#041A13] relative font-sans">
      <header className="bg-[#041A13]/95 backdrop-blur-md px-6 py-6 border-b border-[#1B3629] flex items-center gap-4 shrink-0 z-10 sticky top-0">
        <button onClick={onBack} className="w-10 h-10 bg-[#0A241C] border border-[#1B3629] rounded-xl flex items-center justify-center text-[#FFFFFF] hover:bg-[#10271E] transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-black text-[#FFFFFF]">
          {step === 1 ? "Your Details" : "Checkout"}
        </h1>
      </header>

      <div className="flex-1 overflow-y-auto p-6 pb-32">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6 max-w-md mx-auto"
            >
              <div className="bg-[#0A241C] p-6 rounded-3xl shadow-lg border border-[#1B3629]">
                <h2 className="text-lg font-black text-[#FFFFFF] mb-2">Checkout Details</h2>
                <p className="text-sm text-[#A7B4AE] mb-6 font-medium">Enter your details to confirm your order.</p>
                
                <div className="space-y-4">
                  {/* Name Input */}
                  <div>
                    <label className="block text-[11px] font-bold text-[#A7B4AE] uppercase tracking-widest mb-1.5 ml-1">Your Name</label>
                    <input 
                      type="text" 
                      value={localName}
                      onChange={e => setLocalName(e.target.value)}
                      disabled={otpSent}
                      className={`w-full bg-[#041A13] border ${errors.name ? 'border-red-400 focus:ring-red-500' : 'border-[#1B3629] focus:border-[#D4A53A]'} rounded-2xl px-5 py-4 text-sm text-[#FFFFFF] focus:outline-none transition-colors disabled:opacity-50 placeholder:text-[#A7B4AE]/50`}
                      placeholder="e.g. Rahul Kumar"
                    />
                    {errors.name && <p className="text-xs text-red-500 font-bold mt-1.5 ml-1">{errors.name}</p>}
                  </div>

                  {/* Phone Input */}
                  <div>
                    <label className="block text-[11px] font-bold text-[#A7B4AE] uppercase tracking-widest mb-1.5 ml-1">Mobile Number</label>
                    <div className="flex relative">
                      <div className="absolute left-0 top-0 bottom-0 px-5 flex items-center bg-[#041A13] border border-[#1B3629] border-r-0 rounded-l-2xl text-[#FFFFFF] font-bold text-sm">
                        +91
                      </div>
                      <input 
                        type="tel" 
                        value={localPhone}
                        onChange={e => setLocalPhone(e.target.value.replace(/\D/g, '').slice(0,10))}
                        disabled={otpSent}
                        className={`w-full bg-[#041A13] border ${errors.phone ? 'border-red-400 focus:ring-red-500' : 'border-[#1B3629] focus:border-[#D4A53A]'} rounded-r-2xl pl-16 pr-5 py-4 text-sm text-[#FFFFFF] focus:outline-none transition-colors disabled:opacity-50 placeholder:text-[#A7B4AE]/50`}
                        placeholder="10-digit number"
                      />
                    </div>
                    {errors.phone && <p className="text-xs text-red-500 font-bold mt-1.5 ml-1">{errors.phone}</p>}
                  </div>

                  {/* Table Input */}
                  <div>
                    <label className="block text-[11px] font-bold text-[#A7B4AE] uppercase tracking-widest mb-1.5 ml-1">Table Number</label>
                    <input 
                      type="number" 
                      value={localTable}
                      onChange={e => setLocalTable(e.target.value)}
                      disabled={otpSent || !!tableNumber} // Lock if passed from QR
                      className={`w-full bg-[#041A13] border ${errors.table ? 'border-red-400 focus:ring-red-500' : 'border-[#1B3629] focus:border-[#D4A53A]'} rounded-2xl px-5 py-4 text-sm text-[#FFFFFF] focus:outline-none transition-colors disabled:opacity-50 placeholder:text-[#A7B4AE]/50`}
                      placeholder="1 to 10"
                      min="1" max="10"
                    />
                    {errors.table && <p className="text-xs text-red-500 font-bold mt-1.5 ml-1">{errors.table}</p>}
                  </div>

                  {otpSent && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="pt-5 border-t border-[#1B3629]">
                      <label className="block text-[11px] font-bold text-[#A7B4AE] uppercase tracking-widest mb-1.5 ml-1 text-center">Enter OTP sent to +91 {localPhone}</label>
                      <input 
                        type="text" 
                        value={otpInput}
                        onChange={e => setOtpInput(e.target.value.replace(/\D/g, '').slice(0,4))}
                        className="w-full bg-[#041A13] border border-[#D4A53A] rounded-2xl px-5 py-4 text-center tracking-[1em] font-black text-xl text-[#FFFFFF] focus:outline-none focus:ring-2 focus:ring-[#D4A53A]/20"
                        placeholder="••••"
                      />
                    </motion.div>
                  )}
                </div>

                <div className="mt-6">
                  {!otpSent ? (
                    <button 
                      onClick={handleSendOTP}
                      disabled={isVerifying}
                      className="w-full bg-[#D4A53A] text-[#041A13] font-black py-4 rounded-2xl shadow-lg shadow-[#D4A53A]/20 flex items-center justify-center disabled:opacity-50 transition-colors"
                    >
                      {isVerifying ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send OTP"}
                    </button>
                  ) : (
                    <button 
                      onClick={handleVerifyOTP}
                      disabled={isVerifying || otpInput.length !== 4}
                      className="w-full bg-[#0F8F5B] text-[#FFFFFF] font-black py-4 rounded-2xl shadow-lg shadow-[#0F8F5B]/20 flex items-center justify-center disabled:opacity-50 disabled:bg-[#1B3629] transition-colors"
                    >
                      {isVerifying ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify & Proceed"}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 max-w-md mx-auto"
            >
              {/* Order Summary */}
              <div className="bg-[#0A241C] rounded-3xl shadow-lg border border-[#1B3629] overflow-hidden">
                <div className="bg-[#041A13] px-6 py-5 border-b border-[#1B3629]">
                  <h3 className="font-black text-xl text-[#FFFFFF]">Order Summary</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-[#D4A53A] font-bold bg-[#D4A53A]/10 px-2 py-0.5 rounded-md">Table {localTable}</span>
                    <span className="text-xs text-[#A7B4AE]">{localName}</span>
                  </div>
                </div>
                <div className="p-6 space-y-5">
                  {cart.map((item, idx) => {
                    const priceAdd = (item.customizations?.cheese ? 30 : 0) + (item.customizations?.butter ? 20 : 0);
                    const itemTotal = (item.price + priceAdd) * item.cartQuantity;
                    const custArr = item.customizations ? Object.values(item.customizations).filter(Boolean) : [];
                    return (
                      <div key={item.cartItemId || idx} className="flex justify-between items-start">
                        <div className="flex gap-3">
                          <div className="w-7 h-7 bg-[#041A13] rounded-lg flex items-center justify-center text-xs font-black text-[#D4A53A] shrink-0 border border-[#1B3629]">
                            {item.cartQuantity}x
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[#FFFFFF]">{item.name}</p>
                            {custArr.length > 0 && (
                              <p className="text-[11px] text-[#A7B4AE] font-medium mt-1">{custArr.join(", ")}</p>
                            )}
                          </div>
                        </div>
                        <p className="text-sm font-black text-[#FFFFFF]">₹{itemTotal.toFixed(2)}</p>
                      </div>
                    );
                  })}
                  
                  <div className="pt-4 border-t border-dashed border-[#1B3629] space-y-2">
                    <div className="flex justify-between text-sm text-[#A7B4AE]">
                      <span>Subtotal</span>
                      <span className="text-[#FFFFFF]">₹{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-[#A7B4AE]">
                      <span>Taxes & GST (5%)</span>
                      <span className="text-[#FFFFFF]">₹{gst.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-[#1B3629] flex justify-between items-center">
                    <div>
                      <p className="text-lg font-black text-[#FFFFFF]">Grand Total</p>
                      <p className="text-[11px] text-[#0F8F5B] font-bold mt-0.5">Estimated prep: {prepTime} mins</p>
                    </div>
                    <p className="text-2xl font-black text-[#D4A53A]">₹{grandTotal.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* General Instructions */}
              <div className="bg-[#0A241C] rounded-3xl shadow-lg border border-[#1B3629] p-6">
                <h3 className="font-bold text-sm text-[#FFFFFF] mb-3">Special Instructions</h3>
                <textarea 
                  value={generalInstructions}
                  onChange={e => setGeneralInstructions(e.target.value)}
                  placeholder="e.g. Make it extra spicy, less oil..."
                  className="w-full bg-[#041A13] border border-[#1B3629] rounded-2xl p-4 text-sm text-[#FFFFFF] focus:outline-none focus:border-[#D4A53A] resize-none h-24 placeholder:text-[#A7B4AE]/50 transition-colors"
                />
              </div>

              {/* Payment Method */}
              <div className="bg-[#0A241C] rounded-3xl shadow-lg border border-[#1B3629] p-6">
                <h3 className="font-bold text-sm text-[#FFFFFF] mb-4">Payment Method</h3>
                <div className="space-y-3">
                  <button 
                    onClick={() => setPaymentMethod("ONLINE")}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all ${paymentMethod === "ONLINE" ? 'border-[#0F8F5B] bg-[#0F8F5B]/5 shadow-sm' : 'border-[#1B3629] bg-[#041A13] hover:border-[#D4A53A]/50'}`}
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${paymentMethod === "ONLINE" ? 'bg-[#0F8F5B] text-[#FFFFFF]' : 'bg-[#1B3629] text-[#A7B4AE]'}`}>
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div className="text-left flex-1">
                      <p className={`font-bold text-[15px] ${paymentMethod === "ONLINE" ? 'text-[#0F8F5B]' : 'text-[#FFFFFF]'}`}>Pay Online</p>
                      <p className="text-[11px] text-[#A7B4AE] mt-0.5">Credit, Debit, UPI via Razorpay</p>
                    </div>
                    {paymentMethod === "ONLINE" && <div className="w-5 h-5 rounded-full bg-[#0F8F5B] border-[5px] border-[#0F8F5B]/20"></div>}
                  </button>

                  <button 
                    onClick={() => setPaymentMethod("CASH")}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all ${paymentMethod === "CASH" ? 'border-[#D4A53A] bg-[#D4A53A]/5 shadow-sm' : 'border-[#1B3629] bg-[#041A13] hover:border-[#D4A53A]/50'}`}
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${paymentMethod === "CASH" ? 'bg-[#D4A53A] text-[#041A13]' : 'bg-[#1B3629] text-[#A7B4AE]'}`}>
                      <Banknote className="w-5 h-5" />
                    </div>
                    <div className="text-left flex-1">
                      <p className={`font-bold text-[15px] ${paymentMethod === "CASH" ? 'text-[#D4A53A]' : 'text-[#FFFFFF]'}`}>Pay at Table</p>
                      <p className="text-[11px] text-[#A7B4AE] mt-0.5">Pay by cash after dining</p>
                    </div>
                    {paymentMethod === "CASH" && <div className="w-5 h-5 rounded-full bg-[#D4A53A] border-[5px] border-[#D4A53A]/20"></div>}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Confirm Button for Step 2 */}
      <AnimatePresence>
        {step === 2 && !showConfirmDialog && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="absolute bottom-6 left-6 right-6 md:left-auto md:right-8 md:w-96 z-40"
          >
            <button 
              onClick={handleProceedToPayment}
              disabled={isPlacing}
              className="w-full bg-[#0F8F5B] text-[#FFFFFF] p-5 rounded-[20px] shadow-2xl shadow-[#0F8F5B]/30 font-black text-lg flex justify-between items-center hover:bg-[#12a66a] transition-all disabled:opacity-50"
            >
              <span>{isPlacing ? 'Processing...' : 'Confirm & Pay'}</span>
              {!isPlacing && <span>₹{grandTotal.toFixed(2)}</span>}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Two-Step Confirmation Dialog */}
      <AnimatePresence>
        {showConfirmDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#041A13]/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-[#0A241C] border border-[#1B3629] rounded-[32px] p-8 shadow-[0_20px_50px_rgba(4,26,19,0.8)]"
            >
              <div className="w-20 h-20 bg-[#D4A53A]/10 text-[#D4A53A] rounded-full flex items-center justify-center mb-6 mx-auto border border-[#D4A53A]/20 shadow-inner">
                <Receipt className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-black text-center text-[#FFFFFF] mb-3">Review Order</h2>
              <p className="text-sm text-center text-[#A7B4AE] mb-8 font-medium leading-relaxed">
                Please review your order carefully. Once confirmed, it will be sent to the kitchen immediately and cannot be modified.
              </p>
              
              <div className="space-y-3">
                <button 
                  onClick={() => setShowConfirmDialog(false)}
                  className="w-full py-4 bg-[#041A13] border border-[#1B3629] text-[#D4A53A] hover:border-[#D4A53A]/50 rounded-2xl font-bold transition-colors"
                >
                  Edit Order
                </button>
                <button 
                  onClick={confirmOrderProceed}
                  disabled={isPlacing}
                  className="w-full py-4 bg-[#0F8F5B] text-[#FFFFFF] hover:bg-[#12a66a] rounded-2xl font-black transition-all shadow-lg shadow-[#0F8F5B]/20 flex items-center justify-center"
                >
                  {isPlacing ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirm Order"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
