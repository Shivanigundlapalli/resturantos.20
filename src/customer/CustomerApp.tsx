import React, { useState, useEffect } from "react";
import CustomerDashboard from "./CustomerDashboard";
import CustomerCheckout from "./CustomerCheckout";
import CustomerOrderTracking from "./CustomerOrderTracking";
import { MenuItem } from "../types";

export type CustomerFlowState = "dashboard" | "checkout" | "tracking";

export interface CartItem extends MenuItem {
  cartItemId: string;
  cartQuantity: number;
  customizations?: any;
}

export default function CustomerApp() {
  const [flowState, setFlowState] = useState<CustomerFlowState>("dashboard");
  
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
    // Parse URL params for ?restaurant=spiceheaven&table=5
    const params = new URLSearchParams(window.location.search);
    const rId = params.get("restaurant");
    const tNum = params.get("table");
    
    if (rId) setRestaurantId(rId);
    if (tNum) setTableNumber(tNum);
  }, []);

  const handleProceedToCheckout = () => {
    if (cart.length > 0) {
      setFlowState("checkout");
    }
  };

  const handleOrderConfirmed = (orderId: string) => {
    setActiveOrderId(orderId);
    setFlowState("tracking");
  };

  const handleBackToDashboard = () => {
    setFlowState("dashboard");
  };

  return (
    <div className="w-screen h-screen bg-[#041A13] overflow-hidden font-sans">
      {flowState === "dashboard" && (
        <CustomerDashboard 
          cart={cart}
          setCart={setCart}
          onCheckout={handleProceedToCheckout}
          customerName={customerName}
          mobileNumber={mobileNumber}
          tableNumber={tableNumber}
        />
      )}
      {flowState === "checkout" && (
        <CustomerCheckout 
          cart={cart}
          customerName={customerName}
          mobileNumber={mobileNumber}
          tableNumber={tableNumber}
          setCustomerName={setCustomerName}
          setMobileNumber={setMobileNumber}
          onConfirm={handleOrderConfirmed}
          onBack={handleBackToDashboard}
        />
      )}
      {flowState === "tracking" && activeOrderId && (
        <CustomerOrderTracking 
          orderId={activeOrderId}
          customerName={customerName}
        />
      )}
    </div>
  );
}
