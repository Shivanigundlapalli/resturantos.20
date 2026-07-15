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

  const handleSendOTP = () => {
    if (!validateForm()) return;
    setIsVerifying(true);
    setTimeout(() => {
      setOtpSent(true);
      setIsVerifying(false);
    }, 1000);
  };

  const handleVerifyOTP = () => {
    if (otpInput.length !== 4) return;
    setIsVerifying(true);
    setTimeout(() => {
      setCustomerName(localName);
      setMobileNumber(localPhone);
      setStep(2);
      setIsVerifying(false);
    }, 1000);
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
      name: "RestaurantOS",
      description: "Order Payment",
      handler: async function (response: any) {
        await submitOrder("PAID");
      },
      prefill: {
        name: localName,
        contact: localPhone
      },
      theme: {
        color: "#059669"
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
    <div className="w-full h-full flex flex-col bg-zinc-50 relative">
      <header className="bg-white px-4 py-4 shadow-sm flex items-center gap-4 shrink-0 z-10">
        <button onClick={onBack} className="p-2 bg-zinc-50 hover:bg-zinc-100 rounded-full text-zinc-600 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-black text-zinc-900">
          {step === 1 ? "Your Details" : "Order Review"}
        </h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4 pb-32">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6 max-w-md mx-auto"
            >
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
                <h2 className="text-lg font-bold text-zinc-900 mb-2">Checkout Details</h2>
                <p className="text-sm text-zinc-500 mb-6">Enter your details to confirm your order.</p>
                
                <div className="space-y-4">
                  {/* Name Input */}
                  <div>
                    <label className="block text-xs font-bold text-zinc-600 mb-1">Your Name</label>
                    <input 
                      type="text" 
                      value={localName}
                      onChange={e => setLocalName(e.target.value)}
                      disabled={otpSent}
                      className={`w-full bg-zinc-50 border ${errors.name ? 'border-red-400 focus:ring-red-500' : 'border-zinc-200 focus:ring-emerald-500'} rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 disabled:opacity-50`}
                      placeholder="e.g. Rahul Kumar"
                    />
                    {errors.name && <p className="text-xs text-red-500 font-bold mt-1">{errors.name}</p>}
                  </div>

                  {/* Phone Input */}
                  <div>
                    <label className="block text-xs font-bold text-zinc-600 mb-1">Mobile Number</label>
                    <div className="flex relative">
                      <div className="absolute left-0 top-0 bottom-0 px-4 flex items-center bg-zinc-100 border border-zinc-200 border-r-0 rounded-l-xl text-zinc-600 font-bold text-sm">
                        +91
                      </div>
                      <input 
                        type="tel" 
                        value={localPhone}
                        onChange={e => setLocalPhone(e.target.value.replace(/\D/g, '').slice(0,10))}
                        disabled={otpSent}
                        className={`w-full bg-zinc-50 border ${errors.phone ? 'border-red-400 focus:ring-red-500' : 'border-zinc-200 focus:ring-emerald-500'} rounded-r-xl pl-16 pr-4 py-3 text-sm focus:outline-none focus:ring-2 disabled:opacity-50`}
                        placeholder="10-digit mobile number"
                      />
                    </div>
                    {errors.phone && <p className="text-xs text-red-500 font-bold mt-1">{errors.phone}</p>}
                  </div>

                  {/* Table Input */}
                  <div>
                    <label className="block text-xs font-bold text-zinc-600 mb-1">Table Number</label>
                    <input 
                      type="number" 
                      value={localTable}
                      onChange={e => setLocalTable(e.target.value)}
                      disabled={otpSent || !!tableNumber} // Lock if passed from QR
                      className={`w-full bg-zinc-50 border ${errors.table ? 'border-red-400 focus:ring-red-500' : 'border-zinc-200 focus:ring-emerald-500'} rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 disabled:opacity-50`}
                      placeholder="1 to 10"
                      min="1" max="10"
                    />
                    {errors.table && <p className="text-xs text-red-500 font-bold mt-1">{errors.table}</p>}
                  </div>

                  {otpSent && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="pt-4 border-t border-zinc-100">
                      <label className="block text-xs font-bold text-zinc-600 mb-1">Enter OTP sent to +91 {localPhone}</label>
                      <input 
                        type="text" 
                        value={otpInput}
                        onChange={e => setOtpInput(e.target.value.replace(/\D/g, '').slice(0,4))}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-center tracking-[1em] font-black text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                      className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center disabled:opacity-70"
                    >
                      {isVerifying ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send OTP"}
                    </button>
                  ) : (
                    <button 
                      onClick={handleVerifyOTP}
                      disabled={isVerifying || otpInput.length !== 4}
                      className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center disabled:opacity-70"
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
              <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
                <div className="bg-zinc-900 px-6 py-4 text-white">
                  <h3 className="font-black text-lg">Order Summary</h3>
                  <p className="text-xs text-zinc-400">Spice Heaven • Table {localTable}</p>
                  <p className="text-xs text-zinc-400 mt-1">{localName} (+91 {localPhone})</p>
                </div>
                <div className="p-6 space-y-4">
                  {cart.map((item, idx) => {
                    const priceAdd = (item.customizations?.cheese ? 30 : 0) + (item.customizations?.butter ? 20 : 0);
                    const itemTotal = (item.price + priceAdd) * item.cartQuantity;
                    const custArr = item.customizations ? Object.values(item.customizations).filter(Boolean) : [];
                    return (
                      <div key={item.cartItemId || idx} className="flex justify-between items-start">
                        <div className="flex gap-3">
                          <div className="w-6 h-6 bg-zinc-100 rounded-md flex items-center justify-center text-xs font-black text-zinc-500 shrink-0 mt-0.5">
                            {item.cartQuantity}x
                          </div>
                          <div>
                            <p className="text-sm font-bold text-zinc-900">{item.name}</p>
                            {custArr.length > 0 && (
                              <p className="text-xs text-zinc-500 font-medium mt-1">{custArr.join(", ")}</p>
                            )}
                          </div>
                        </div>
                        <p className="text-sm font-black text-zinc-900">₹{itemTotal.toFixed(2)}</p>
                      </div>
                    );
                  })}
                  
                  <div className="pt-4 border-t border-dashed border-zinc-200 space-y-2">
                    <div className="flex justify-between text-sm text-zinc-500">
                      <span>Subtotal</span>
                      <span>₹{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-zinc-500">
                      <span>Taxes & GST (5%)</span>
                      <span>₹{gst.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-zinc-100 flex justify-between items-center">
                    <div>
                      <p className="text-lg font-black text-zinc-900">Grand Total</p>
                      <p className="text-xs text-emerald-600 font-bold">Estimated prep: {prepTime} mins</p>
                    </div>
                    <p className="text-xl font-black text-emerald-600">₹{grandTotal.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* General Instructions */}
              <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6">
                <h3 className="font-bold text-sm text-zinc-900 mb-3">Special Instructions</h3>
                <textarea 
                  value={generalInstructions}
                  onChange={e => setGeneralInstructions(e.target.value)}
                  placeholder="e.g. Make it extra spicy, less oil..."
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none h-24"
                />
              </div>

              {/* Payment Method */}
              <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6">
                <h3 className="font-bold text-sm text-zinc-900 mb-4">Payment Method</h3>
                <div className="space-y-3">
                  <button 
                    onClick={() => setPaymentMethod("ONLINE")}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${paymentMethod === "ONLINE" ? 'border-emerald-500 bg-emerald-50' : 'border-zinc-100 bg-white hover:border-zinc-200'}`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${paymentMethod === "ONLINE" ? 'bg-emerald-100 text-emerald-600' : 'bg-zinc-100 text-zinc-400'}`}>
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div className="text-left flex-1">
                      <p className={`font-bold ${paymentMethod === "ONLINE" ? 'text-emerald-900' : 'text-zinc-600'}`}>Pay Online</p>
                      <p className="text-xs text-zinc-500">Credit, Debit, UPI via Razorpay</p>
                    </div>
                    {paymentMethod === "ONLINE" && <div className="w-4 h-4 rounded-full bg-emerald-500 border-4 border-emerald-200 shadow-sm"></div>}
                  </button>

                  <button 
                    onClick={() => setPaymentMethod("CASH")}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${paymentMethod === "CASH" ? 'border-emerald-500 bg-emerald-50' : 'border-zinc-100 bg-white hover:border-zinc-200'}`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${paymentMethod === "CASH" ? 'bg-emerald-100 text-emerald-600' : 'bg-zinc-100 text-zinc-400'}`}>
                      <Banknote className="w-5 h-5" />
                    </div>
                    <div className="text-left flex-1">
                      <p className={`font-bold ${paymentMethod === "CASH" ? 'text-emerald-900' : 'text-zinc-600'}`}>Pay at Table</p>
                      <p className="text-xs text-zinc-500">Pay by cash after dining</p>
                    </div>
                    {paymentMethod === "CASH" && <div className="w-4 h-4 rounded-full bg-emerald-500 border-4 border-emerald-200 shadow-sm"></div>}
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
            className="absolute bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-96 z-40"
          >
            <button 
              onClick={handleProceedToPayment}
              disabled={isPlacing}
              className="w-full bg-emerald-600 text-white p-4 rounded-2xl shadow-2xl shadow-emerald-600/30 font-bold text-lg flex justify-between items-center hover:bg-emerald-700 transition-colors disabled:opacity-70"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl"
            >
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4 mx-auto">
                <Receipt className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-black text-center text-zinc-900 mb-2">Review Your Order</h2>
              <p className="text-sm text-center text-zinc-500 mb-6 font-medium leading-relaxed">
                Please review your order carefully. Once confirmed, it will be sent to the kitchen immediately and cannot be modified.
              </p>
              
              <div className="space-y-3">
                <button 
                  onClick={onBack}
                  className="w-full py-3.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-xl font-bold transition-colors"
                >
                  🟡 Yes, Edit Order
                </button>
                <button 
                  onClick={confirmOrderProceed}
                  disabled={isPlacing}
                  className="w-full py-3.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl font-bold transition-colors flex items-center justify-center"
                >
                  {isPlacing ? <Loader2 className="w-5 h-5 animate-spin" /> : "🟢 No, Confirm Order"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
