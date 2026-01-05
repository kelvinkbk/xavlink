import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { useToast } from "../context/ToastContext";
import PageTransition from "../components/PageTransition";
import LoadingSpinner from "../components/LoadingSpinner";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      showToast("Please enter your email", "error");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSubmitted(true);
      showToast("Check your email for reset instructions", "success");
    } catch (error) {
      showToast(
        error.response?.data?.message || "Failed to send reset email",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-secondary text-center mb-6">
            Forgot Password
          </h1>

          {submitted ? (
            <div className="text-center">
              <div className="mb-4 text-green-600 text-5xl">✓</div>
              <p className="text-gray-700 mb-4">
                If an account exists with that email, we've sent password reset
                instructions.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Check your email and follow the link to reset your password.
              </p>
              <Link
                to="/login"
                className="text-primary hover:underline font-medium"
              >
                Back to Login
              </Link>
            </div>
          ) : (
            <>
              <p className="text-gray-600 text-center mb-6">
                Enter your email address and we'll send you a link to reset your
                password.
              </p>

              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-gray-700 font-medium mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    placeholder="you@example.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary text-white py-3 rounded-lg font-medium hover:bg-blue-600 transition disabled:opacity-50 flex items-center justify-center"
                >
                  {loading ? <LoadingSpinner /> : "Send Reset Link"}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  to="/login"
                  className="text-primary hover:underline text-sm"
                >
                  Back to Login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
