import React, { useState } from 'react';
import { motion } from 'motion/react';
import { CreditCard, Banknote, Loader2 } from 'lucide-react';
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

  const subtotal = cart.reduce((sum, item) => {
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
    const itemInstructions = cart.map(item => {
      const custs = item.customizations;
      if (!custs || Object.keys(custs).length === 0) return null;
      const parts = Object.entries(custs).filter(([_,v]) => v).map(([_,v]) => v).join(", ");
      return parts ? `${item.name} (${item.cartQuantity}x): ${parts}` : null;
    }).filter(Boolean).join(" | ");

    const orderData = {
      customerName: customerName.trim(),
      phone: `+91 ${mobileNumber}`,
      tableOrType: `Table ${tableNumber}`,
      items: cart.map(item => {
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

    setIsProcessing(true);
    const isLoaded = await loadRazorpayScript();
    if (!isLoaded) {
      alert("Razorpay SDK failed to load. Are you online?");
      setIsProcessing(false);
      return;
    }

    try {
      console.log("Creating Razorpay order on backend...");
      // 1. Create order on the backend
      const res = await fetch("/api/payment/create-razorpay-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: grandTotal })
      });
      const data = await res.json();
      console.log("Backend response:", data);
      
      if (!data.success) {
        alert("Failed to initialize payment: " + data.message);
        setIsProcessing(false);
        return;
      }

      console.log("Initializing Razorpay checkout...");
      // 2. Open Razorpay Checkout
      const options: any = {
        key: (import.meta as any).env.VITE_RAZORPAY_KEY_ID || "rzp_test_TDlNGuvutaLf6K",
        amount: data.amount,
        currency: "INR",
        name: "Spice Heaven",
        description: "Order Payment",
        image: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=128&h=128&fit=crop",
        handler: function (response: any) {
          console.log("Payment successful:", response);
          createOrderInDb("Paid", "RAZORPAY");
        },
        prefill: {
          name: customerName,
          contact: mobileNumber
        },
        theme: {
          color: "#f59e0b"
        },
        modal: {
          ondismiss: function() {
            console.log("Razorpay modal dismissed");
            setIsProcessing(false);
          }
        }
      };

      if (!data.isMock && data.order_id) {
        options.order_id = data.order_id;
      }

      console.log("Razorpay options:", options);
      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        console.error("Payment failed:", response.error);
        alert("Payment failed: " + response.error.description);
        setIsProcessing(false);
      });
      
      console.log("Opening Razorpay modal...");
      rzp.open();
    } catch (err) {
      console.error("Payment error caught:", err);
      alert("Network error creating payment order.");
      setIsProcessing(false);
    }
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
    </motion.div>
  );
}
