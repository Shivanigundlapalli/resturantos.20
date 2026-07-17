import React, { useState, useEffect } from "react";
import { ArrowLeft, Loader2, CreditCard, Banknote, CheckCircle2 } from "lucide-react";
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
  
  // Checkout flow states: "details" -> "otp" -> "payment"
  const [checkoutStep, setCheckoutStep] = useState<"details" | "otp" | "payment">("details");
  
  // Form State
  const [localName, setLocalName] = useState(customerName);
  const [localPhone, setLocalPhone] = useState(mobileNumber);
  const [localTable, setLocalTable] = useState(tableNumber);
  
  // Validation Errors
  const [errors, setErrors] = useState<{name?: string, phone?: string, table?: string}>({});
  
  // OTP State
  const [otpInput, setOtpInput] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<"ONLINE" | "CASH">("ONLINE");
  const [isPlacing, setIsPlacing] = useState(false);

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
    
    // Name validation
    if (!localName || localName.trim().length < 3) {
      newErrors.name = "Name must be at least 3 characters.";
      isValid = false;
    }

    // Phone validation
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(localPhone)) {
      newErrors.phone = "Enter a valid 10-digit mobile number.";
      isValid = false;
    }

    // Table validation
    if (!localTable || isNaN(Number(localTable)) || Number(localTable) < 1 || Number(localTable) > 20 || !Number.isInteger(Number(localTable))) {
      newErrors.table = "Table number must be an integer (1-20).";
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
        body: JSON.stringify({ phone: `+91 ${localPhone}` }) // removed space just in case, or left it if backend expects it.
      });
      
      const data = await res.json();
      if (data.success) {
        setCheckoutStep("otp");
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
        body: JSON.stringify({ phone: `+91 ${localPhone}`, otp: otpInput, name: localName })
      });
      
      const data = await res.json();
      if (data.success) {
        setCustomerName(localName);
        setMobileNumber(localPhone);
        setCheckoutStep("payment");
      } else {
        alert("Invalid OTP!");
      }
    } catch (err) {
      alert("Network error verifying OTP");
    } finally {
      setIsVerifying(false);
    }
  };

  const submitOrder = async (payStatus: string) => {
    setIsPlacing(true);
    
    // Combine Special Instructions
    const itemInstructions = (Array.isArray(cart) ? cart : []).map(item => {
      const custs = item.customizations;
      if (!custs || Object.keys(custs).length === 0) return null;
      const parts = Object.entries(custs).filter(([_,v]) => v).map(([_,v]) => v).join(", ");
      return parts ? `${item.name} (${item.cartQuantity}x): ${parts}` : null;
    }).filter(Boolean).join(" | ");

    const orderData = {
      customerName: localName.trim(),
      phone: `+91 ${localPhone}`,
      tableOrType: `Table ${localTable}`,
      items: (Array.isArray(cart) ? cart : []).map(item => ({
        menuItemId: item.id,
        name: item.name,
        quantity: item.cartQuantity,
        price: item.price + (item.customizations?.cheese ? 30 : 0) + (item.customizations?.butter ? 20 : 0)
      })),
      status: "Pending",
      payment_method: paymentMethod === "CASH" ? "PAY_AT_TABLE" : "RAZORPAY",
      payment_status: payStatus,
      estimated_prep_time: prepTime,
      special_instructions: itemInstructions
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
        setIsPlacing(false);
      }
    } catch (err) {
      console.error(err);
      alert("Network error.");
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

  const handlePlaceOrder = () => {
    if (paymentMethod === "CASH") {
      submitOrder("PENDING");
    } else {
      initiateRazorpay();
    }
  };

  const subtotal = (Array.isArray(cart) ? cart : []).reduce((sum, item) => {
    const itemPrice = item.price + (item.customizations?.cheese ? 30 : 0) + (item.customizations?.butter ? 20 : 0);
    return sum + (itemPrice * item.cartQuantity);
  }, 0);
  const gst = subtotal * 0.05;
  const grandTotal = subtotal + gst;
  const prepTime = Math.max(15, (Array.isArray(cart) ? cart : []).length * 3);

  return (
    <div className="w-full h-full flex flex-col bg-[#041A13] relative font-sans">
      <header className="bg-[#041A13]/95 backdrop-blur-md px-6 py-6 border-b border-[#1B3629] flex items-center gap-4 shrink-0 z-10 sticky top-0">
        <button onClick={onBack} className="w-10 h-10 bg-[#0A241C] border border-[#1B3629] rounded-xl flex items-center justify-center text-[#FFFFFF] hover:bg-[#10271E] transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-black text-[#FFFFFF]">Checkout</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-6 pb-32">
        <div className="max-w-md mx-auto space-y-6">
          
          {/* Progress Indicator */}
          <div className="flex items-center justify-between mb-8 px-2 relative">
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-[#1B3629] -z-10 -translate-y-1/2"></div>
            
            <div className="flex flex-col items-center gap-1.5">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${checkoutStep === "details" ? "bg-[#D4A53A] text-[#041A13]" : "bg-[#0F8F5B] text-[#FFFFFF]"}`}>
                {checkoutStep === "details" ? "1" : <CheckCircle2 className="w-4 h-4" />}
              </div>
              <span className={`text-[10px] font-bold ${checkoutStep === "details" ? "text-[#D4A53A]" : "text-[#A7B4AE]"}`}>Details</span>
            </div>
            
            <div className="flex flex-col items-center gap-1.5">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${checkoutStep === "otp" ? "bg-[#D4A53A] text-[#041A13]" : checkoutStep === "payment" ? "bg-[#0F8F5B] text-[#FFFFFF]" : "bg-[#1B3629] text-[#A7B4AE]"}`}>
                {checkoutStep === "payment" ? <CheckCircle2 className="w-4 h-4" /> : "2"}
              </div>
              <span className={`text-[10px] font-bold ${checkoutStep === "otp" ? "text-[#D4A53A]" : checkoutStep === "payment" ? "text-[#A7B4AE]" : "text-[#A7B4AE]"}`}>Verify</span>
            </div>
            
            <div className="flex flex-col items-center gap-1.5">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${checkoutStep === "payment" ? "bg-[#D4A53A] text-[#041A13]" : "bg-[#1B3629] text-[#A7B4AE]"}`}>
                3
              </div>
              <span className={`text-[10px] font-bold ${checkoutStep === "payment" ? "text-[#D4A53A]" : "text-[#A7B4AE]"}`}>Payment</span>
            </div>
          </div>

          <AnimatePresence mode="wait">
            
            {/* STEP 1: Details */}
            {checkoutStep === "details" && (
              <motion.div 
                key="details"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-[#0A241C] p-6 rounded-3xl shadow-lg border border-[#1B3629]"
              >
                <h2 className="text-lg font-black text-[#FFFFFF] mb-6">Customer Details</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-[#A7B4AE] uppercase tracking-widest mb-1.5 ml-1">Full Name *</label>
                    <input 
                      type="text" 
                      value={localName}
                      onChange={e => setLocalName(e.target.value)}
                      className={`w-full bg-[#041A13] border ${errors.name ? 'border-red-400' : 'border-[#1B3629]'} rounded-2xl px-5 py-4 text-sm text-[#FFFFFF] focus:outline-none focus:border-[#D4A53A]`}
                      placeholder="e.g. Rahul Kumar"
                    />
                    {errors.name && <p className="text-xs text-red-500 mt-1 ml-1">{errors.name}</p>}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#A7B4AE] uppercase tracking-widest mb-1.5 ml-1">Mobile Number *</label>
                    <div className="flex relative">
                      <div className="absolute left-0 top-0 bottom-0 px-5 flex items-center bg-[#041A13] border border-[#1B3629] border-r-0 rounded-l-2xl text-[#FFFFFF] font-bold text-sm">
                        +91
                      </div>
                      <input 
                        type="tel" 
                        value={localPhone}
                        onChange={e => setLocalPhone(e.target.value.replace(/\D/g, '').slice(0,10))}
                        className={`w-full bg-[#041A13] border ${errors.phone ? 'border-red-400' : 'border-[#1B3629]'} rounded-r-2xl pl-16 pr-5 py-4 text-sm text-[#FFFFFF] focus:outline-none focus:border-[#D4A53A]`}
                        placeholder="10-digit number"
                      />
                    </div>
                    {errors.phone && <p className="text-xs text-red-500 mt-1 ml-1">{errors.phone}</p>}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#A7B4AE] uppercase tracking-widest mb-1.5 ml-1">Table Number *</label>
                    <input 
                      type="number" 
                      value={localTable}
                      onChange={e => setLocalTable(e.target.value)}
                      disabled={!!tableNumber} // Locked if scanned from QR
                      className={`w-full bg-[#041A13] border ${errors.table ? 'border-red-400' : 'border-[#1B3629]'} rounded-2xl px-5 py-4 text-sm text-[#FFFFFF] focus:outline-none focus:border-[#D4A53A] disabled:opacity-50`}
                      placeholder="e.g. 5"
                    />
                    {errors.table && <p className="text-xs text-red-500 mt-1 ml-1">{errors.table}</p>}
                  </div>
                </div>

                <div className="mt-6">
                  <button 
                    onClick={handleSendOTP}
                    disabled={isVerifying}
                    className="w-full bg-[#D4A53A] text-[#041A13] font-black py-4 rounded-2xl flex items-center justify-center transition-colors"
                  >
                    {isVerifying ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify Number"}
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 2: OTP Verification */}
            {checkoutStep === "otp" && (
              <motion.div 
                key="otp"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-[#0A241C] p-6 rounded-3xl shadow-lg border border-[#1B3629] text-center"
              >
                <h2 className="text-lg font-black text-[#FFFFFF] mb-2">Verify OTP</h2>
                <p className="text-sm text-[#A7B4AE] mb-6">Enter the 4-digit code sent to +91 {localPhone}</p>
                
                <input 
                  type="text" 
                  value={otpInput}
                  onChange={e => setOtpInput(e.target.value.replace(/\D/g, '').slice(0,4))}
                  className="w-full bg-[#041A13] border border-[#D4A53A] rounded-2xl px-5 py-4 text-center tracking-[1em] font-black text-2xl text-[#FFFFFF] focus:outline-none focus:ring-2 focus:ring-[#D4A53A]/20 mb-6"
                  placeholder="••••"
                  autoFocus
                />

                <button 
                  onClick={handleVerifyOTP}
                  disabled={isVerifying || otpInput.length !== 4}
                  className="w-full bg-[#0F8F5B] text-[#FFFFFF] font-black py-4 rounded-2xl flex items-center justify-center disabled:opacity-50 transition-colors"
                >
                  {isVerifying ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify & Proceed"}
                </button>
                <button 
                  onClick={() => setCheckoutStep("details")}
                  className="mt-4 text-[#A7B4AE] text-sm font-bold"
                >
                  Change Number
                </button>
              </motion.div>
            )}

            {/* STEP 3: Payment Selection & Order Summary */}
            {checkoutStep === "payment" && (
              <motion.div 
                key="payment"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="bg-[#0A241C] rounded-3xl p-6 shadow-lg border border-[#1B3629]">
                  <h3 className="font-bold text-sm text-[#FFFFFF] mb-4">Choose Payment Method</h3>
                  <div className="space-y-3">
                    <button 
                      onClick={() => setPaymentMethod("ONLINE")}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all ${paymentMethod === "ONLINE" ? 'border-[#0F8F5B] bg-[#0F8F5B]/5 shadow-sm' : 'border-[#1B3629] bg-[#041A13]'}`}
                    >
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${paymentMethod === "ONLINE" ? 'bg-[#0F8F5B] text-[#FFFFFF]' : 'bg-[#1B3629] text-[#A7B4AE]'}`}>
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div className="text-left flex-1">
                        <p className={`font-bold text-[15px] ${paymentMethod === "ONLINE" ? 'text-[#0F8F5B]' : 'text-[#FFFFFF]'}`}>Razorpay Online</p>
                        <p className="text-[11px] text-[#A7B4AE] mt-0.5">UPI, Cards, Wallets</p>
                      </div>
                      {paymentMethod === "ONLINE" && <div className="w-5 h-5 rounded-full bg-[#0F8F5B] border-[5px] border-[#0F8F5B]/20"></div>}
                    </button>

                    <button 
                      onClick={() => setPaymentMethod("CASH")}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all ${paymentMethod === "CASH" ? 'border-[#D4A53A] bg-[#D4A53A]/5 shadow-sm' : 'border-[#1B3629] bg-[#041A13]'}`}
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

                <div className="bg-[#0A241C] rounded-3xl overflow-hidden shadow-lg border border-[#1B3629]">
                  <div className="p-5 border-b border-[#1B3629]">
                    <h3 className="font-bold text-sm text-[#FFFFFF]">Order Summary</h3>
                  </div>
                  <div className="p-5 space-y-4">
                    {(Array.isArray(cart) ? cart : []).map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center">
                        <span className="text-sm font-bold text-[#FFFFFF]">{item.cartQuantity}x {item.name}</span>
                        <span className="text-sm font-black text-[#FFFFFF]">₹{((item.price + (item.customizations?.cheese ? 30 : 0) + (item.customizations?.butter ? 20 : 0)) * item.cartQuantity).toFixed(2)}</span>
                      </div>
                    ))}
                    
                    <div className="pt-3 border-t border-dashed border-[#1B3629] space-y-1 text-sm text-[#A7B4AE]">
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>₹{subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>GST (5%)</span>
                        <span>₹{gst.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {checkoutStep === "payment" && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="absolute bottom-6 left-6 right-6 md:left-auto md:right-8 md:w-96 z-40"
          >
            <button 
              onClick={handlePlaceOrder}
              disabled={isPlacing}
              className="w-full bg-[#0F8F5B] text-[#FFFFFF] p-5 rounded-[20px] shadow-2xl shadow-[#0F8F5B]/30 font-black text-lg flex justify-between items-center hover:bg-[#12a66a] transition-all disabled:opacity-50"
            >
              <span>{isPlacing ? 'Processing...' : 'Place Order'}</span>
              {!isPlacing && <span>₹{grandTotal.toFixed(2)}</span>}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
