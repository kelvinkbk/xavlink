import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { authService } from "../services/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFAUserId, setTwoFAUserId] = useState("");
  const [twoFAToken, setTwoFAToken] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data } = await authService.login({ email, password });
      if (data.requires2FA) {
        // Transition to 2FA verification step
        setRequires2FA(true);
        setTwoFAUserId(data.userId);
      } else {
        login(data.user, data.token);
        navigate("/home");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e) => {
    e.preventDefault();
    if (!twoFAToken) {
      setError("Please enter your 6-digit 2FA code");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const result = await authService.verifyTwoFactor(twoFAUserId, twoFAToken);
      // result contains { token, user }
      login(result.user, result.token);
      navigate("/home");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid 2FA code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-96">
        <h1 className="text-3xl font-bold text-center mb-6 text-secondary">
          Login
        </h1>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
            {error}
          </div>
        )}

        {!requires2FA ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-2 rounded-lg font-semibold hover:bg-blue-600 transition disabled:opacity-50"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify2FA} className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 text-blue-700 p-3 rounded">
              Two-factor authentication is enabled. Enter your 6-digit code.
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                2FA Code
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="^[0-9]{6}$"
                value={twoFAToken}
                onChange={(e) =>
                  setTwoFAToken(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="123456"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-2 rounded-lg font-semibold hover:bg-blue-600 transition disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify & Continue"}
            </button>
            <button
              type="button"
              onClick={() => {
                setRequires2FA(false);
                setTwoFAUserId("");
                setTwoFAToken("");
              }}
              className="w-full mt-2 bg-gray-200 text-gray-800 py-2 rounded-lg font-semibold hover:bg-gray-300 transition"
            >
              Back to login
            </button>
          </form>
        )}

        <div className="text-center mt-3">
          <a
            href="/forgot-password"
            className="text-sm text-primary hover:underline"
          >
            Forgot password?
          </a>
        </div>

        <p className="text-center mt-4 text-sm">
          Don't have an account?{" "}
          <a
            href="/register"
            className="text-primary font-semibold hover:underline"
          >
            Register here
          </a>
        </p>
      </div>
    </div>
  );
}
