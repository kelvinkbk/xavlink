import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { authService } from "../services/api";

export default function VerifyEmail() {
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState("pending");
  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get("token");
    if (!token) {
      // Avoid direct setState in effect body
      setTimeout(() => {
        setStatus("error");
        setMessage("Missing verification token.");
      }, 0);
      return;
    }

    authService
      .verifyEmail(token)
      .then(() => {
        setStatus("success");
        setMessage("Email verified successfully. You can now log in.");
        // Optionally redirect after a delay
        setTimeout(() => navigate("/login"), 1500);
      })
      .catch((err) => {
        const apiMsg = err?.response?.data?.message;
        setStatus("error");
        setMessage(apiMsg || "Verification failed or token expired.");
      });
  }, [location.search, navigate]);

  const bg =
    status === "success"
      ? "bg-green-100"
      : status === "error"
      ? "bg-red-100"
      : "bg-blue-100";
  const text =
    status === "success"
      ? "text-green-800"
      : status === "error"
      ? "text-red-800"
      : "text-blue-800";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md p-6 rounded-lg shadow bg-[#0B1621] text-white">
        <h1 className="text-2xl font-semibold text-center mb-4">
          Verify Email
        </h1>
        <div className={`rounded p-3 mb-4 ${bg}`}>
          <p className={text}>{message}</p>
        </div>
        <div className="text-center">
          <button
            className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700"
            onClick={() => navigate("/login")}
          >
            Go to Login
          </button>
        </div>
      </div>
    </div>
  );
}
