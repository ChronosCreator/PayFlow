
import { useState } from "react";
import Dashboard from "./components/Dashboard";

interface Merchant {
  userId: string;
  merchantId: string;
  name: string;
  email: string;
  token: string;
}

const getSavedMerchant = (): Merchant | null => {
  try {
    const savedMerchant = localStorage.getItem("payflow_merchant");

    if (!savedMerchant) return null;

    const merchant: Merchant = JSON.parse(savedMerchant);

    if (!merchant.token || !merchant.name || !merchant.email) {
      return null;
    }

    return merchant;
  } catch {
    return null;
  }
};

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [merchant, setMerchant] = useState<Merchant | null>(
    getSavedMerchant
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        "http://localhost:5000/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Login failed");
      }

      const merchantData: Merchant = result.data;

      localStorage.setItem("payflow_token", merchantData.token);
      localStorage.setItem(
        "payflow_merchant",
        JSON.stringify(merchantData)
      );

      setMerchant(merchantData);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to connect to server"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("payflow_token");
    localStorage.removeItem("payflow_merchant");

    setMerchant(null);
    setPassword("");
  };

  if (merchant) {
    return (
     <Dashboard
  name={merchant.name}
  email={merchant.email}
  token={merchant.token}
  merchantId={merchant.merchantId}
  onLogout={handleLogout}
/>
    );
  }

  return (
    <div className="min-h-screen bg-[#080d19] flex items-center justify-center px-4 text-white">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 mb-4">
            <span className="text-3xl font-bold">P</span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight">
            PayFlow
          </h1>

          <p className="text-slate-400 mt-2">
            Payments made simple.
          </p>
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-2xl font-semibold">
            Welcome back
          </h2>

          <p className="text-slate-400 text-sm mt-2 mb-7">
            Sign in to your merchant dashboard
          </p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm mb-2 text-slate-300">
                Email address
              </label>

              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="merchant@example.com"
                className="w-full bg-[#080d19] border border-slate-700 rounded-lg px-4 py-3 outline-none focus:border-blue-500 transition"
              />
            </div>

            <div>
              <label className="block text-sm mb-2 text-slate-300">
                Password
              </label>

              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full bg-[#080d19] border border-slate-700 rounded-lg px-4 py-3 outline-none focus:border-blue-500 transition"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 rounded-lg py-3 font-semibold transition"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="text-center text-slate-500 text-xs mt-7">
            Secure merchant payment management
          </p>
        </div>

        <p className="text-center text-slate-600 text-xs mt-7">
          © 2026 PayFlow. All rights reserved.
        </p>
      </div>
    </div>
  );
}

export default App;
