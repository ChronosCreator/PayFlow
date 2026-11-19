
import { useCallback, useEffect, useState } from "react";

interface Payment {
  id: string;
  amount: number | string;
  currency: string;
  status: string;
  provider: string;
  providerOrderId?: string | null;
  providerPaymentId?: string | null;
  createdAt: string;
  order?: {
    orderNumber: string;
  };
  customer?: {
    name: string;
    email: string;
  };
}

interface PaymentsProps {
  token: string;
}

const API_BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

const API = API_BASE_URL.endsWith("/api")
  ? `${API_BASE_URL}/payments`
  : `${API_BASE_URL}/api/payments`;
  
function Payments({ token }: PaymentsProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const loadPayments = useCallback(async () => {
    try {
      setError("");

      const response = await fetch(API, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to load payments");
      }

      setPayments(result.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const formatCurrency = (
    amount: number | string,
    currency: string
  ) => {
    try {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }).format(Number(amount));
    } catch {
      return `${currency} ${amount}`;
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "SUCCESS":
        return "bg-green-500/10 text-green-400";
      case "FAILED":
        return "bg-red-500/10 text-red-400";
      case "PENDING":
        return "bg-yellow-500/10 text-yellow-400";
      case "REFUNDED":
        return "bg-purple-500/10 text-purple-400";
      default:
        return "bg-blue-500/10 text-blue-400";
    }
  };

  const successfulPayments = payments.filter(
    (payment) => payment.status === "SUCCESS"
  );

  const totalRevenue = successfulPayments.reduce(
    (total, payment) => total + Number(payment.amount),
    0
  );

  const filteredPayments = payments.filter((payment) => {
    const matchesStatus =
      filter === "ALL" || payment.status === filter;

    const searchTerm = search.trim().toLowerCase();

    const matchesSearch =
      !searchTerm ||
      payment.customer?.name?.toLowerCase().includes(searchTerm) ||
      payment.customer?.email?.toLowerCase().includes(searchTerm) ||
      payment.providerPaymentId?.toLowerCase().includes(searchTerm) ||
      payment.providerOrderId?.toLowerCase().includes(searchTerm) ||
      payment.order?.orderNumber?.toLowerCase().includes(searchTerm) ||
      payment.id.toLowerCase().includes(searchTerm);

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-8">

      {/* Heading */}
      <div>
        <p className="text-slate-400">
          Monitor and track your payment transactions
        </p>
        <h2 className="text-xl font-semibold mt-2">
          Payment Management
        </h2>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-4">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-5">

        <div className="bg-[#111827] border border-slate-800 rounded-xl p-6">
          <p className="text-sm text-slate-400">Total Payments</p>
          <h3 className="text-2xl font-bold mt-3">
            {payments.length}
          </h3>
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-xl p-6">
          <p className="text-sm text-slate-400">
            Successful Payments
          </p>
          <h3 className="text-2xl font-bold mt-3 text-green-400">
            {successfulPayments.length}
          </h3>
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-xl p-6">
          <p className="text-sm text-slate-400">
            Successful Revenue
          </p>
          <h3 className="text-2xl font-bold mt-3">
            {formatCurrency(totalRevenue, "INR")}
          </h3>
        </div>

      </section>

      {/* Payment Transactions */}
      <section className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden">

        <div className="p-6 border-b border-slate-800 space-y-5">

          <div>
            <h3 className="text-lg font-semibold">
              All Transactions
            </h3>
            <p className="text-sm text-slate-400 mt-1">
              {filteredPayments.length} transactions found
            </p>
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-3">

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer, email, payment ID or order ID..."
              className="flex-1 bg-[#080d19] border border-slate-700 rounded-lg px-4 py-3 text-sm outline-none focus:border-blue-500"
            />

            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-[#080d19] border border-slate-700 rounded-lg px-4 py-3 text-sm outline-none focus:border-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="CREATED">Created</option>
              <option value="PENDING">Pending</option>
              <option value="SUCCESS">Success</option>
              <option value="FAILED">Failed</option>
              <option value="REFUNDED">Refunded</option>
            </select>

            <button
              onClick={loadPayments}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-5 py-3 text-sm disabled:opacity-50"
            >
              Refresh
            </button>

          </div>
        </div>

        {loading ? (
          <p className="p-8 text-center text-slate-400">
            Loading payments...
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">

              <thead className="bg-[#0d1423] text-slate-400">
                <tr>
                  <th className="p-4">Payment ID</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Provider</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Date</th>
                </tr>
              </thead>

              <tbody>
                {filteredPayments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="border-t border-slate-800 hover:bg-slate-800/30"
                  >
                    <td className="p-4">
                      <p className="font-medium">
                        {payment.providerPaymentId
                          ? `${payment.providerPaymentId.slice(0, 12)}...`
                          : payment.id.slice(0, 12) + "..."}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {payment.order?.orderNumber || "—"}
                      </p>
                    </td>

                    <td className="p-4">
                      <p className="font-medium">
                        {payment.customer?.name || "Unknown"}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {payment.customer?.email || "—"}
                      </p>
                    </td>

                    <td className="p-4 whitespace-nowrap">
                      {formatCurrency(payment.amount, payment.currency)}
                    </td>

                    <td className="p-4">
                      {payment.provider}
                    </td>

                    <td className="p-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs ${getStatusStyle(payment.status)}`}
                      >
                        {payment.status}
                      </span>
                    </td>

                    <td className="p-4 text-slate-400 whitespace-nowrap">
                      {new Date(payment.createdAt).toLocaleDateString("en-IN")}
                    </td>
                  </tr>
                ))}

                {filteredPayments.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-8 text-center text-slate-500"
                    >
                      No payment transactions found.
                    </td>
                  </tr>
                )}
              </tbody>

            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default Payments;
