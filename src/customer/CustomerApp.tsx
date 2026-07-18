import React, { useState, useEffect } from "react";
import { MenuItem } from "../types";
import { AnimatePresence, motion } from "motion/react";

import WelcomeStep from "./steps/WelcomeStep";
import DetailsStep from "./steps/DetailsStep";
import OtpStep from "./steps/OtpStep";
import MenuStep from "./steps/MenuStep";
import CartStep from "./steps/CartStep";
import PaymentStep from "./steps/PaymentStep";
import ConfirmedStep from "./steps/ConfirmedStep";
import CustomerOrderTracking from "./CustomerOrderTracking";

export type CustomerFlowState = "welcome" | "details" | "otp" | "menu" | "cart" | "payment" | "confirmed" | "tracking";

export interface CartItem extends MenuItem {
  cartItemId: string;
  cartQuantity: number;
  customizations?: any;
}

export default function CustomerApp() {
  const [flowState, setFlowState] = useState<CustomerFlowState>("welcome");
  
  // URL Params state
  const [restaurantId, setRestaurantId] = useState<string>("");
  const [tableNumber, setTableNumber] = useState<string>("");

  // Customer Details state
  const [customerName, setCustomerName] = useState<string>("");
  const [mobileNumber, setMobileNumber] = useState<string>("");
  
  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Active Order state
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rId = params.get("restaurant");
    const tNum = params.get("table");
    
    if (rId) setRestaurantId(rId);
    if (tNum) setTableNumber(tNum);
  }, []);

  const getStepNumber = () => {
    switch(flowState) {
      case "details": return 1;
      case "otp": return 2;
      case "menu": return 3;
      case "cart": return 4;
      case "payment": return 5;
      case "confirmed": return 6;
      default: return 0;
    }
  };

  const stepNumber = getStepNumber();

  return (
    <div className="w-screen h-screen bg-warm-bg text-text-main overflow-hidden font-sans flex flex-col">
      {/* Progress Header - Only show in Steps 1 to 6 */}
      {stepNumber > 0 && flowState !== "tracking" && (
        <div className="bg-warm-bg px-6 py-4 border-b border-warm-border shrink-0 z-40">
          <div className="flex justify-between items-center mb-2">
            <span className="text-text-sec text-xs font-bold uppercase tracking-widest">Spice Heaven</span>
            <span className="text-customer-primary text-xs font-bold bg-customer-primary/10 px-2 py-1 rounded-md">Step {stepNumber} of 6</span>
          </div>
          <div className="h-1.5 w-full bg-warm-surface rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-customer-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${(stepNumber / 6) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden relative bg-warm-bg">
        <AnimatePresence mode="wait">
          {flowState === "welcome" && (
            <WelcomeStep key="welcome" onNext={() => setFlowState("details")} />
          )}
          
          {flowState === "details" && (
            <DetailsStep 
              key="details"
              customerName={customerName}
              mobileNumber={mobileNumber}
              tableNumber={tableNumber}
              setCustomerName={setCustomerName}
              setMobileNumber={setMobileNumber}
              setTableNumber={setTableNumber}
              onNext={() => setFlowState("otp")}
            />
          )}

          {flowState === "otp" && (
            <OtpStep 
              key="otp"
              customerName={customerName}
              mobileNumber={mobileNumber}
              onNext={() => setFlowState("menu")}
              onBack={() => setFlowState("details")}
            />
          )}

          {flowState === "menu" && (
            <MenuStep 
              key="menu"
              cart={cart}
              setCart={setCart}
              onNext={() => setFlowState("cart")}
            />
          )}

          {flowState === "cart" && (
            <CartStep 
              key="cart"
              cart={cart}
              setCart={setCart}
              customerName={customerName}
              tableNumber={tableNumber}
              mobileNumber={mobileNumber}
              onNext={() => setFlowState("payment")}
              onBack={() => setFlowState("menu")}
            />
          )}

          {flowState === "payment" && (
            <PaymentStep 
              key="payment"
              cart={cart}
              customerName={customerName}
              mobileNumber={mobileNumber}
              tableNumber={tableNumber}
              onOrderCreated={(orderId) => {
                setActiveOrderId(orderId);
                setFlowState("confirmed");
              }}
            />
          )}

          {flowState === "confirmed" && (
            <ConfirmedStep 
              key="confirmed"
              orderId={activeOrderId || ""}
              customerName={customerName}
              onTrackOrder={() => setFlowState("tracking")}
            />
          )}

          {flowState === "tracking" && activeOrderId && (
            <motion.div 
              key="tracking"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              className="w-full h-full bg-warm-bg"
            >
              <CustomerOrderTracking 
                orderId={activeOrderId}
                customerName={customerName}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
