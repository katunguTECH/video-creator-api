// src/components/PayButton.jsx
import React from "react";
import { PaystackButton } from "react-paystack";

const PayButton = ({ email, amount, onSuccess, onClose }) => {
  const publicKey = process.env.REACT_APP_PAYSTACK_PUBLIC_KEY;

  const paystackProps = {
    email,
    amount: amount * 100, // Convert to lowest currency unit (e.g., cents, kobo) [citation:6]
    publicKey,
    text: "Pay Now",
    onSuccess: (reference) => {
      // Reference contains transaction details [citation:8]
      onSuccess(reference);
    },
    onClose: () => {
      onClose();
    },
  };

  return <PaystackButton className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-4 px-6 rounded-full text-xl transition-all transform hover:scale-105" {...paystackProps} />;
};

export default PayButton;