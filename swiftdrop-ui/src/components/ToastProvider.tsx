"use client";

import { useEffect, useState } from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export function ToastProvider() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <ToastContainer
      containerId="swiftdrop-toast"
      position="top-right"
      autoClose={3200}
      hideProgressBar={false}
      limit={4}
      newestOnTop
      closeOnClick
      pauseOnFocusLoss={false}
      draggable={false}
      pauseOnHover
      theme="light"
    />
  );
}
