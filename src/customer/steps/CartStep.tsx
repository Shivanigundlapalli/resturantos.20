import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Minus, Trash2, ChevronLeft, Loader2 } from 'lucide-react';
import { CartItem } from '../CustomerApp';

interface CartStepProps {
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  customerName: string;
  tableNumber: string;
  mobileNumber: string;
  onNext: () => void;
  onBack: () => void;
}

export default function CartStep({ cart, setCart, customerName, tableNumber, mobileNumber, onNext, onBack }: CartStepProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const handleUpdateQuantity = (cartItemId: string, change: number) => {
    setCart(prev => prev.map(item => {
      if (item.cartItemId === cartItemId) {
        const newQty = item.cartQuantity + change;
        if (newQty < 1) return item;
        return { ...item, cartQuantity: newQty };
      }
      return item;
    }));
  };

  const handleRemove = (cartItemId: string) => {
    setCart(prev => prev.filter(item => item.cartItemId !== cartItemId));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.cartQuantity), 0);
  const tax = Math.round((subtotal * 0.05) * 100) / 100;
  const grandTotal = subtotal + tax;

  const handlePlaceOrderClick = () => {
    if (cart.length === 0) return;
    setShowConfirm(true);
  };

  const handleProceed = () => {
    setShowConfirm(false);
    onNext(); // Transition to Payment Step
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }} 
      animate={{ opacity: 1, x: 0 }} 
      exit={{ opacity: 0, x: -20 }}
      className="w-full h-full flex flex-col relative"
    >
      <div className="bg-warm-bg px-6 py-4 flex items-center gap-4 border-b border-warm-border">
        <button onClick={onBack} className="text-text-sec hover:text-text-main transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-black text-text-main tracking-tight">Review Cart</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 pb-[200px]">
        {cart.length === 0 ? (
          <div className="text-center py-20">
            <h3 className="text-text-main font-bold text-lg mb-2">Your cart is empty</h3>
            <p className="text-text-muted mb-6">Add some delicious dishes from our menu!</p>
            <button onClick={onBack} className="bg-customer-primary text-white px-6 py-3 rounded-xl font-bold">
              Browse Menu
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-warm-bg rounded-2xl p-4 border border-warm-border">
              <div className="text-sm text-text-sec mb-1">Ordering for</div>
              <div className="text-lg font-black text-text-main">{customerName} &bull; Table {tableNumber}</div>
            </div>

            <h3 className="font-bold text-text-sec text-sm mt-6 mb-2 uppercase tracking-wider">Your Items</h3>
            
            <div className="space-y-3">
              {cart.map(item => (
                <div key={item.cartItemId} className="bg-warm-bg rounded-2xl p-4 border border-warm-border flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div className="font-bold text-text-main text-[15px] pr-2">{item.name}</div>
                    <div className="font-black text-customer-primary shrink-0">₹{(item.price * item.cartQuantity).toFixed(2)}</div>
                  </div>
                  
                  {item.customizations && Object.keys(item.customizations).length > 0 && (
                    <div className="text-xs text-text-sec">
                      {Object.entries(item.customizations).filter(([_,v]) => v).map(([_,v]) => v).join(", ")}
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <button 
                      onClick={() => handleRemove(item.cartItemId)}
                      className="text-rose-500/80 hover:text-rose-500 flex items-center gap-1 text-xs font-bold"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                    
                    <div className="flex items-center gap-3 bg-warm-bg border border-warm-border rounded-lg p-1">
                      <button 
                        onClick={() => handleUpdateQuantity(item.cartItemId, -1)}
                        className="w-7 h-7 flex items-center justify-center text-text-sec hover:text-text-main hover:bg-warm-card rounded-md transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-4 text-center font-bold text-text-main text-sm">{item.cartQuantity}</span>
                      <button 
                        onClick={() => handleUpdateQuantity(item.cartItemId, 1)}
                        className="w-7 h-7 flex items-center justify-center text-text-sec hover:text-text-main hover:bg-warm-card rounded-md transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-8 bg-warm-bg rounded-2xl p-5 border border-warm-border space-y-3">
              <div className="flex justify-between items-center text-text-sec text-sm">
                <span>Subtotal</span>
                <span className="font-medium text-text-main">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-text-sec text-sm">
                <span>Taxes (5% GST)</span>
                <span className="font-medium text-text-main">₹{tax.toFixed(2)}</span>
              </div>
              <div className="border-t border-warm-border my-2 pt-3 flex justify-between items-center">
                <span className="font-bold text-text-main">Grand Total</span>
                <span className="font-black text-2xl text-customer-primary">₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {cart.length > 0 && (
        <div className="absolute bottom-6 left-0 right-0 px-6 flex justify-center z-40">
          <motion.button
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            onClick={handlePlaceOrderClick}
            className="w-full max-w-md bg-customer-primary text-white px-6 py-4 rounded-2xl font-bold shadow-[0_10px_40px_rgba(245,158,11,0.3)] hover:scale-[1.02] transition-transform text-lg"
          >
            Place Order
          </motion.button>
        </div>
      )}

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirm && (
          <div className="absolute inset-0 z-50 flex items-center justify-center px-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => !isSending && setShowConfirm(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-warm-bg border border-warm-border rounded-3xl p-6 shadow-2xl"
            >
              <h3 className="text-xl font-black text-text-main mb-2">Place Order?</h3>
              <p className="text-text-sec text-sm mb-8">
                Do you want to place this order?<br/>Your order will be sent to the kitchen.
              </p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowConfirm(false)}
                  disabled={isSending}
                  className="flex-1 bg-warm-card text-text-sec font-bold py-3 rounded-xl hover:bg-warm-surface transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleProceed}
                  disabled={isSending}
                  className="flex-1 bg-customer-primary text-white font-bold py-3 rounded-xl hover:bg-amber-400 transition-colors flex items-center justify-center"
                >
                  {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Proceed"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
