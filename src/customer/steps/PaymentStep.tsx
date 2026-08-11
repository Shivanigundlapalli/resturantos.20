import React, { useState } from 'react';
import { motion } from 'motion/react';
import { CreditCard, Banknote, Loader2, CheckCircle2 } from 'lucide-react';
import { loadRazorpayScript } from '../../lib/razorpay';
import { CartItem } from '../CustomerApp';

interface PaymentStepProps {
  cart: CartItem[];
  customerName: string;
  mobileNumber: string;
  tableNumber: string;
  onOrderCreated: (orderId: string) => void;
}

export default function PaymentStep({ cart, customerName, mobileNumber, tableNumber, onOrderCreated }: PaymentStepProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSimState, setPaymentSimState] = useState<"idle" | "processing" | "success">("idle");

  const subtotal = cart?.reduce((sum, item) => {
    let itemPrice = item.price;
    if (item.customizations) {
      if (item.customizations.cheese) itemPrice += 30;
      if (item.customizations.butter) itemPrice += 20;
    }
    return sum + (itemPrice * item.cartQuantity);
  }, 0);
  const tax = Math.round((subtotal * 0.05) * 100) / 100;
  const grandTotal = subtotal + tax;

  const createOrderInDb = async (paymentStatus: string, paymentMethod: string) => {
    setIsProcessing(true);
    
    // Combine Special Instructions
    const itemInstructions = cart?.map(item => {
      const custs = item.customizations;
      if (!custs || Object.keys(custs).length === 0) return null;
      const parts = Object.entries(custs).filter(([_,v]) => v).map(([_,v]) => v).join(", ");
      return parts ? `${item.name} (${item.cartQuantity}x): ${parts}` : null;
    }).filter(Boolean).join(" | ");

    const orderData = {
      customerName: customerName.trim(),
      phone: `+91 ${mobileNumber}`,
      tableOrType: `Table ${tableNumber}`,
      items: cart?.map(item => {
        let itemPrice = item.price;
        if (item.customizations) {
          if (item.customizations.cheese) itemPrice += 30;
          if (item.customizations.butter) itemPrice += 20;
        }
        return {
          menuItemId: item.id,
          name: item.name,
          quantity: item.cartQuantity,
          price: itemPrice
        };
      }),
      status: "Pending",
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      estimated_prep_time: 15,
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
        onOrderCreated(result.id);
      } else {
        const errData = await response.json().catch(() => null);
        alert(errData?.error || "Failed to place order.");
        setIsProcessing(false);
      }
    } catch (err) {
      console.error(err);
      alert("Network error.");
      setIsProcessing(false);
    }
  };

  const handlePayAtTable = () => {
    createOrderInDb("Pending", "PAY_AT_TABLE");
  };

  const handlePayOnline = async () => {
    if (grandTotal <= 0) {
      alert("Amount is 0, cannot proceed to payment.");
      return;
    }

    setPaymentSimState("processing");
    
    // Simulate Razorpay processing delay
    setTimeout(() => {
      setPaymentSimState("success");
      
      // Keep success message visible for 1.5 seconds then proceed
      setTimeout(() => {
        setPaymentSimState("idle");
        createOrderInDb("Paid", "RAZORPAY");
      }, 1500);
    }, 2000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }} 
      animate={{ opacity: 1, x: 0 }} 
      exit={{ opacity: 0, x: -20 }}
      className="w-full max-w-md mx-auto p-6 pt-10 text-center"
    >
      <h2 className="text-2xl font-black text-text-main mb-2 tracking-tight">Choose Payment</h2>
      <p className="text-text-sec text-sm mb-8">Amount to pay: <span className="font-bold text-customer-primary text-lg">₹{grandTotal.toFixed(2)}</span></p>

      {isProcessing ? (
        <div className="flex flex-col items-center justify-center py-10">
          <Loader2 className="w-12 h-12 text-customer-primary animate-spin mb-4" />
          <p className="text-text-main font-bold">Processing Order...</p>
          <p className="text-text-muted text-sm">Please do not refresh</p>
        </div>
      ) : (
        <div className="space-y-4">
          <button 
            onClick={handlePayOnline}
            className="w-full bg-warm-bg border-2 border-customer-primary/50 hover:border-customer-primary text-text-main p-6 rounded-2xl transition-all group relative overflow-hidden text-left flex items-center gap-4"
          >
            <div className="w-12 h-12 bg-customer-primary/10 rounded-xl flex items-center justify-center text-customer-primary group-hover:scale-110 transition-transform">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <div className="font-bold text-lg">Pay Online</div>
              <div className="text-text-sec text-sm">UPI, Cards, Netbanking</div>
            </div>
          </button>
          
          <button 
            onClick={handlePayAtTable}
            className="w-full bg-warm-bg border-2 border-warm-border hover:border-warm-border text-text-main p-6 rounded-2xl transition-all group relative overflow-hidden text-left flex items-center gap-4"
          >
            <div className="w-12 h-12 bg-warm-card rounded-xl flex items-center justify-center text-text-sec group-hover:scale-110 transition-transform">
              <Banknote className="w-6 h-6" />
            </div>
            <div>
              <div className="font-bold text-lg">Pay at Table</div>
              <div className="text-text-sec text-sm">Cash or Card to waiter</div>
            </div>
          </button>
        </div>
      )}

      {paymentSimState !== "idle" && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#041A13]/90 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#0A241C] p-8 rounded-2xl border border-[#1B3629] flex flex-col items-center gap-4 max-w-sm w-full mx-4"
          >
            {paymentSimState === "processing" ? (
              <>
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-[#1B3629] border-t-[#0F8F5B] rounded-full animate-spin"></div>
                  <Banknote className="w-6 h-6 text-[#0F8F5B] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <h3 className="text-xl font-bold text-[#FFFFFF]">Processing Payment...</h3>
                <p className="text-[#8B9D96] text-center text-sm">Please do not close this window or press back.</p>
              </>
            ) : (
              <>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", bounce: 0.5 }}
                >
                  <CheckCircle2 className="w-20 h-20 text-[#0F8F5B]" />
                </motion.div>
                <h3 className="text-xl font-bold text-[#0F8F5B]">Payment Completed!</h3>
                <p className="text-[#8B9D96] text-center text-sm">Your order is being confirmed.</p>
              </>
            )}
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
