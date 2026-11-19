
import { useEffect, useState } from "react";
import Products from "./Products";
import Customers from "./Customers";
import Orders from "./Orders";
import Payments from "./Payments";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";



interface DashboardProps {
  name: string;
  email: string;
  token: string;
  merchantId: string;
  onLogout: () => void;
}

interface Order {
  id: string;
  orderNumber: string;
  amount: number | string;
  currency: string;
  status: string;
  createdAt: string;
  customer: {
  name: string;
  email: string;
};
}

interface Analytics {
  totalPayments: number;
  successfulPayments: number;
  pendingPayments: number;
  failedPayments: number;
  successfulRevenue: number;
  successRate: number;
  revenueByMonth: {
    month: string;
    revenue: number;
  }[];
  recentPayments: {
    id: string;
    amount: number | string;
    currency: string;
    status: string;
    createdAt: string;
    customer: {
      name: string;
      email: string;
    };
    order: {
      orderNumber: string;
    };
  }[];
}


interface Customer {
  id: string;
}

interface Product {
  id: string;
}


const API_BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

const API = API_BASE_URL
  ? API_BASE_URL.endsWith("/api")
    ? API_BASE_URL
    : `${API_BASE_URL}/api`
  : "/api";


function Dashboard({
  name,
  email,
  token,
  merchantId,
  onLogout,
}: DashboardProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [, setCustomers] = useState<Customer[]>([]);
  const [, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [error, setError] = useState("");
 const pageStorageKey = `payflow_active_page_${merchantId}`;

const [activePage, setActivePage] = useState(() => {
  const savedPage = localStorage.getItem(pageStorageKey);

  const allowedPages = [
    "Dashboard",
    "Payments",
    "Orders",
    "Customers",
    "Products",
  ];

  return savedPage && allowedPages.includes(savedPage)
    ? savedPage
    : "Dashboard";
});
  useEffect(() => {
    const headers = {
      Authorization: `Bearer ${token}`,
    };

    const loadDashboard = async () => {
      try {
       const [
  ordersRes,
  customersRes,
  productsRes,
  analyticsRes,
] = await Promise.all([
  fetch(`${API}/orders`, { headers }),
  fetch(`${API}/customers`, { headers }),
  fetch(`${API}/products`, { headers }),
  fetch(`${API}/analytics`, { headers }),
]);

       if (
  !ordersRes.ok ||
  !customersRes.ok ||
  !productsRes.ok ||
  !analyticsRes.ok
) {
  throw new Error("Unable to load dashboard data");
}

        const [
  ordersData,
  customersData,
  productsData,
  analyticsData,
] = await Promise.all([
  ordersRes.json(),
  customersRes.json(),
  productsRes.json(),
  analyticsRes.json(),
]);

setOrders(ordersData.data);
setCustomers(customersData.data);
setProducts(productsData.data);
setAnalytics(analyticsData.data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong"
        );
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [token]);

 

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);

  return (
    <div className="min-h-screen bg-[#080d19] text-white flex">

      {/* Sidebar */}
      <aside className="w-64 bg-[#0d1423] border-r border-slate-800 p-6 hidden md:flex flex-col">

        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-xl font-bold">
            P
          </div>
          <span className="text-xl font-bold">PayFlow</span>
        </div>

        <p className="text-xs text-slate-500 uppercase mb-4">
          Workspace
        </p>

        <nav className="space-y-2">
          {[
            "Dashboard",
            "Payments",
            "Orders",
            "Customers",
            "Products",
          ].map((item) => (
            <button
              key={item}
             onClick={() => {
  setActivePage(item);
  localStorage.setItem(pageStorageKey, item);
}}
              className={`w-full text-left px-4 py-3 rounded-lg text-sm transition ${
                activePage === item
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              {item}
            </button>
          ))}
        </nav>

        <div className="mt-auto border-t border-slate-800 pt-5">
          <p className="text-sm font-medium">{name}</p>
          <p className="text-xs text-slate-500 truncate mt-1">
            {email}
          </p>
          <button
            onClick={onLogout}
            className="mt-5 text-sm text-red-400 hover:text-red-300"
          >
            Sign out ↗
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 p-5 md:p-9">

        <header className="flex justify-between items-center mb-10">
          <div>
            <p className="text-slate-400 text-sm">
              Workspace
            </p>
            <h1 className="text-2xl md:text-3xl font-bold mt-1">
              {activePage}
            </h1>
          </div>

          <button
            onClick={onLogout}
            className="md:hidden text-sm text-red-400"
          >
            Sign out
          </button>

          <div className="hidden sm:block bg-[#111827] border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-300">
            {name}
          </div>
        </header>

        {/* Page Content */}
        {loading && activePage === "Dashboard" ? (
          <p className="text-slate-400">Loading dashboard...</p>
        ) : error && activePage === "Dashboard" ? (
          <p className="text-red-400">{error}</p>
        ) : activePage === "Payments" ? (
          <Payments token={token} />
        ) : activePage === "Orders" ? (
          <Orders token={token} />
        ) : activePage === "Customers" ? (
          <Customers token={token} />
        ) : activePage === "Products" ? (
          <Products token={token} />
        ) : activePage === "Dashboard" ? (
          <>
            
{/* Dashboard Stats */}
<section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">

  <div className="bg-[#111827] border border-slate-800 rounded-xl p-6">
    <p className="text-sm text-slate-400">Successful Revenue</p>
    <h2 className="text-2xl font-bold mt-3">
      {formatCurrency(analytics?.successfulRevenue ?? 0)}
    </h2>
    <p className="text-xs text-slate-500 mt-2">From successful payments</p>
  </div>

  <div className="bg-[#111827] border border-slate-800 rounded-xl p-6">
    <p className="text-sm text-slate-400">Total Payments</p>
    <h2 className="text-2xl font-bold mt-3">
      {analytics?.totalPayments ?? 0}
    </h2>
    <p className="text-xs text-slate-500 mt-2">All transactions</p>
  </div>

  <div className="bg-[#111827] border border-slate-800 rounded-xl p-6">
    <p className="text-sm text-slate-400">Successful Payments</p>
    <h2 className="text-2xl font-bold mt-3 text-green-400">
      {analytics?.successfulPayments ?? 0}
    </h2>
    <p className="text-xs text-slate-500 mt-2">
      Success rate: {analytics?.successRate ?? 0}%
    </p>
  </div>

  <div className="bg-[#111827] border border-slate-800 rounded-xl p-6">
    <p className="text-sm text-slate-400">Pending / Failed</p>
    <h2 className="text-2xl font-bold mt-3">
      <span className="text-yellow-400">{analytics?.pendingPayments ?? 0}</span>
      {" / "}
      <span className="text-red-400">{analytics?.failedPayments ?? 0}</span>
    </h2>
    <p className="text-xs text-slate-500 mt-2">Payment statuses</p>
  </div>

</section>


{/* Revenue Overview */}
<section className="mt-8 bg-[#111827] border border-slate-800 rounded-xl p-6">
  <div className="mb-6">
    <h2 className="text-lg font-semibold">Revenue Overview</h2>
    <p className="text-sm text-slate-400 mt-1">
      Successful payment revenue over the last 6 months
    </p>
  </div>

  <div className="h-72 w-full">
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={analytics?.revenueByMonth ?? []}>
        <defs>
          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke="#263244" />

        <XAxis
          dataKey="month"
          stroke="#94a3b8"
          tick={{ fontSize: 12 }}
        />

        <YAxis
          stroke="#94a3b8"
          tick={{ fontSize: 12 }}
          tickFormatter={(value) => `₹${value}`}
        />

        <Tooltip
          contentStyle={{
            backgroundColor: "#111827",
            border: "1px solid #334155",
            borderRadius: "10px",
            color: "#fff",
          }}
          formatter={(value) => [
            `₹${Number(value).toLocaleString("en-IN")}`,
            "Revenue",
          ]}
        />

        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#3b82f6"
          strokeWidth={3}
          fill="url(#revenueGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  </div>
</section>



{/* Recent Transactions */}
<section className="mt-8 bg-[#111827] border border-slate-800 rounded-xl overflow-hidden">
  <div className="p-6 border-b border-slate-800">
    <h2 className="text-lg font-semibold">Recent Transactions</h2>
    <p className="text-sm text-slate-400 mt-1">
      Your latest 5 payment transactions
    </p>
  </div>

  <div className="overflow-x-auto">
    <table className="w-full text-left">
      <thead className="bg-[#0f172a] text-slate-400 text-sm">
        <tr>
          <th className="px-6 py-4">Customer</th>
          <th className="px-6 py-4">Order ID</th>
          <th className="px-6 py-4">Amount</th>
          <th className="px-6 py-4">Status</th>
          <th className="px-6 py-4">Date</th>
        </tr>
      </thead>

      <tbody className="divide-y divide-slate-800">
        {analytics?.recentPayments?.length ? (
          analytics.recentPayments.map((payment) => (
            <tr key={payment.id} className="hover:bg-slate-800/40">
              <td className="px-6 py-4">
                <p className="text-white font-medium">
                  {payment.customer.name}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {payment.customer.email}
                </p>
              </td>

              <td className="px-6 py-4 text-sm text-slate-300">
                {payment.order.orderNumber}
              </td>

              <td className="px-6 py-4 text-white font-semibold">
                {new Intl.NumberFormat("en-IN", {
                  style: "currency",
                  currency: payment.currency,
                }).format(Number(payment.amount))}
              </td>

              <td className="px-6 py-4">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    payment.status === "SUCCESS"
                      ? "bg-green-500/10 text-green-400"
                      : payment.status === "PENDING"
                      ? "bg-yellow-500/10 text-yellow-400"
                      : payment.status === "FAILED"
                      ? "bg-red-500/10 text-red-400"
                      : "bg-slate-500/10 text-slate-400"
                  }`}
                >
                  {payment.status}
                </span>
              </td>

              <td className="px-6 py-4 text-sm text-slate-400">
                {new Date(payment.createdAt).toLocaleDateString("en-IN")}
              </td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
              No transactions found.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
</section>


           
{/* Recent Orders */}
<section className="mt-9 bg-[#111827] border border-slate-800 rounded-xl overflow-hidden">
  <div className="p-6 border-b border-slate-800">
    <h2 className="text-lg font-semibold">Recent Orders</h2>
    <p className="text-sm text-slate-500 mt-1">
      Your latest payment orders
    </p>
  </div>

  <div className="overflow-x-auto">
    <table className="w-full text-sm text-left">
      <thead className="text-slate-400 bg-[#0d1423]">
        <tr>
          <th className="p-4">Customer</th>
          <th className="p-4">Order ID</th>
          <th className="p-4">Amount</th>
          <th className="p-4">Status</th>
          <th className="p-4">Date</th>
        </tr>
      </thead>

      <tbody>
        {orders.slice(0, 5).map((order) => (
          <tr
            key={order.id}
            className="border-t border-slate-800 hover:bg-slate-800/40"
          >
            <td className="p-4">
              <p className="font-medium text-white">
                {order.customer.name}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {order.customer.email}
              </p>
            </td>

            <td className="p-4 font-medium text-slate-300">
              {order.orderNumber}
            </td>

            <td className="p-4 font-semibold text-white">
              {formatCurrency(Number(order.amount))}
            </td>

            <td className="p-4">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                order.status === "PAID"
                  ? "bg-green-500/10 text-green-400"
                  : order.status === "PENDING"
                  ? "bg-yellow-500/10 text-yellow-400"
                  : order.status === "FAILED"
                  ? "bg-red-500/10 text-red-400"
                  : "bg-blue-500/10 text-blue-400"
              }`}>
                {order.status}
              </span>
            </td>

            <td className="p-4 text-slate-400">
              {new Date(order.createdAt).toLocaleDateString("en-IN")}
            </td>
          </tr>
        ))}

        {orders.length === 0 && (
          <tr>
            <td colSpan={5} className="p-8 text-center text-slate-500">
              No orders yet. Your orders will appear here.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
</section>

          </>
        ) : (
          <div className="bg-[#111827] border border-slate-800 rounded-xl p-8">
            <h2 className="text-xl font-semibold">{activePage}</h2>
            <p className="text-slate-400 mt-2">
              This section is coming soon. We are building it next.
            </p>
          </div>
        )}

        <footer className="text-center text-slate-600 text-xs mt-10">
          © 2026 PayFlow. Built for modern payments.
        </footer>

      </main>
    </div>
  );
}

export default Dashboard;