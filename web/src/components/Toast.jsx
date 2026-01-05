import React, { useEffect } from "react";

export default function Toast({
  open,
  message,
  type = "success",
  onClose,
  duration = 2500,
}) {
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => onClose?.(), duration);
    return () => clearTimeout(t);
  }, [open, duration, onClose]);

  if (!open) return null;

  const bg = type === "error" ? "bg-red-600" : "bg-green-600";

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className={`text-white px-4 py-2 rounded-lg shadow-lg ${bg}`}>
        {message}
      </div>
    </div>
  );
}
