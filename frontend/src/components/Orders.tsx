import { useCallback, useEffect, useState } from "react";

interface Customer {
  id: string;
  name: string;
  email: string;
}

interface Product {
  id: string;
  name: string;
  price: number | string;
  currency: string;
  active: boolean;
}

interface Payment {
  id: string;
  status: string;
  provider: string;
  providerOrderId?: string;
}

interface Order {
  id: string;
  orderNumber: string;
  amount: number | string;
  currency: string;
  status: string;
  createdAt: string;
  customer?: Customer;
  payments?: Payment[];
}

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayFailureResponse {
  error?: {
    description?: string;
    reason?: string;
    metadata?: {
      payment_id?: string;
      order_id?: string;
    };
  };
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: {
    name?: string;
    email?: string;
  };
  handler: (response: RazorpayResponse) => void;
  modal?: {
    ondismiss?: () => void;
  };
  theme?: {
    color?: string;
  };
}

interface RazorpayInstance {
  open: () => void;
  on: (
    event: "payment.failed",
    handler: (response: RazorpayFailureResponse) => void
  ) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }

  interface ImportMetaEnv {
    readonly VITE_RAZORPAY_KEY_ID: string;
    readonly VITE_API_URL?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

interface OrdersProps {
  token: string;
}

const API_BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

const API = API_BASE_URL.endsWith("/api")
  ? API_BASE_URL
  : `${API_BASE_URL}/api`;

function Orders({ token }: OrdersProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");

  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [retryingOrderId, setRetryingOrderId] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const loadOrders = useCallback(async () => {
    try {
      setError("");

      const response = await fetch(`${API}/orders`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to load orders");
      }

      setOrders(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load orders");
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadCheckoutData = useCallback(async () => {
    try {
      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const [customerResponse, productResponse] = await Promise.all([
        fetch(`${API}/customers`, { headers }),
        fetch(`${API}/products`, { headers }),
      ]);

      const customerResult = await customerResponse.json();
      const productResult = await productResponse.json();

      if (!customerResponse.ok) {
        throw new Error(customerResult.message || "Unable to load customers");
      }

      if (!productResponse.ok) {
        throw new Error(productResult.message || "Unable to load products");
      }

      setCustomers(customerResult.data);
      setProducts(productResult.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load checkout data"
      );
    }
  }, [token]);

  useEffect(() => {
    loadOrders();
    loadCheckoutData();
  }, [loadOrders, loadCheckoutData]);

  const formatCurrency = (amount: number | string, currency: string) => {
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
      case "PAID":
      case "SUCCESS":
        return "bg-green-500/10 text-green-400";
      case "FAILED":
        return "bg-red-500/10 text-red-400";
      case "PENDING":
        return "bg-yellow-500/10 text-yellow-400";
      case "CANCELLED":
      case "REFUNDED":
        return "bg-slate-500/10 text-slate-400";
      default:
        return "bg-blue-500/10 text-blue-400";
    }
  };

  // Report a failed payment to the backend.
  const reportPaymentFailure = async (
    orderId: string,
    paymentId?: string
  ) => {
    if (!paymentId) {
      setMessage(
        "Payment was not completed. The order remains available for retry."
      );
      await loadOrders();
      return;
    }

    try {
      const response = await fetch(`${API}/payments/failure`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to update payment status");
      }

      setMessage("Payment status updated.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update failed payment"
      );
    } finally {
      await loadOrders();
    }
  };

  const loadRazorpay = async () => {
    if (window.Razorpay) return;

    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");

      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;

      script.onload = () => resolve();
      script.onerror = () =>
        reject(new Error("Unable to load Razorpay Checkout."));

      document.body.appendChild(script);
    });

    if (!window.Razorpay) {
      throw new Error("Razorpay Checkout could not be initialized.");
    }
  };

  const createOrderAndPay = async () => {
    try {
      setError("");
      setMessage("");

      if (!selectedCustomer || !selectedProduct) {
        setError("Please select a customer and a product.");
        return;
      }

      const key = import.meta.env.VITE_RAZORPAY_KEY_ID;

      if (!key) {
        throw new Error("Razorpay Key ID is missing from frontend .env");
      }

      const product = products.find((item) => item.id === selectedProduct);
      const customer = customers.find((item) => item.id === selectedCustomer);

      if (!product || !customer) {
        throw new Error("Selected customer or product was not found.");
      }

      if (Number(product.price) <= 0) {
        throw new Error("Product price must be greater than zero.");
      }

      setCheckoutLoading(true);

      await loadRazorpay();

      const orderResponse = await fetch(`${API}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({
          customerId: customer.id,
          amount: Number(product.price),
          currency: product.currency || "INR",
        }),
      });

      const orderResult = await orderResponse.json();

      if (!orderResponse.ok) {
        throw new Error(orderResult.message || "Order creation failed.");
      }

      const createdOrder = orderResult.data as Order;
      const providerOrderId = createdOrder.payments?.[0]?.providerOrderId;

      if (!providerOrderId) {
        throw new Error("Razorpay order ID was not returned by the backend.");
      }

      const checkout = new window.Razorpay!({
        key,
        amount: Math.round(Number(product.price) * 100),
        currency: product.currency || "INR",
        name: "PayFlow",
        description: product.name,
        order_id: providerOrderId,
        prefill: {
          name: customer.name,
          email: customer.email,
        },
        theme: {
          color: "#3b82f6",
        },
        handler: async (paymentResponse) => {
          try {
            setError("");
            setMessage("Payment received. Verifying payment...");

            const verifyResponse = await fetch(`${API}/payments/verify`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(paymentResponse),
            });

            const verifyResult = await verifyResponse.json();

            if (!verifyResponse.ok) {
              throw new Error(
                verifyResult.message || "Payment verification failed."
              );
            }

            setMessage("Payment verified successfully!");
          } catch (err) {
            setError(
              err instanceof Error
                ? err.message
                : "Payment verification failed."
            );
          } finally {
            setCheckoutLoading(false);
            await loadOrders();
          }
        },
        modal: {
          ondismiss: () => {
            setCheckoutLoading(false);
            setMessage("Checkout was closed. Your order remains available.");
            loadOrders();
          },
        },
      });

      checkout.on("payment.failed", async (response) => {
        setCheckoutLoading(false);
        setError(
          response.error?.description || "Payment failed. Please try again."
        );

        await reportPaymentFailure(
          providerOrderId,
          response.error?.metadata?.payment_id
        );
      });

      checkout.open();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
      setCheckoutLoading(false);
    }
  };

  const retryPayment = async (order: Order) => {
    try {
      setError("");
      setMessage("");
      setRetryingOrderId(order.id);

      const key = import.meta.env.VITE_RAZORPAY_KEY_ID;

      if (!key) {
        throw new Error("Razorpay Key ID is missing.");
      }

      await loadRazorpay();

      const response = await fetch(`${API}/orders/${order.id}/retry`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Payment retry failed.");
      }

      const newPayment = result.data.payment;
      const customer = order.customer;

      if (!newPayment?.providerOrderId) {
        throw new Error("New Razorpay order ID was not returned.");
      }

      const checkout = new window.Razorpay!({
        key,
        amount: Math.round(Number(order.amount) * 100),
        currency: order.currency,
        name: "PayFlow",
        description: `Retry payment for ${order.orderNumber}`,
        order_id: newPayment.providerOrderId,
        prefill: {
          name: customer?.name,
          email: customer?.email,
        },
        theme: {
          color: "#3b82f6",
        },
        handler: async (paymentResponse) => {
          try {
            setError("");
            setMessage("Payment received. Verifying payment...");

            const verifyResponse = await fetch(`${API}/payments/verify`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(paymentResponse),
            });

            const verifyResult = await verifyResponse.json();

            if (!verifyResponse.ok) {
              throw new Error(
                verifyResult.message || "Payment verification failed."
              );
            }

            setMessage("Retry payment verified successfully!");
          } catch (err) {
            setError(
              err instanceof Error
                ? err.message
                : "Payment verification failed."
            );
          } finally {
            setRetryingOrderId(null);
            await loadOrders();
          }
        },
        modal: {
          ondismiss: () => {
            setRetryingOrderId(null);
            setMessage("Checkout closed. You can retry this order again.");
            loadOrders();
          },
        },
      });

      checkout.on("payment.failed", async (failureResponse) => {
        setRetryingOrderId(null);

        setError(
          failureResponse.error?.description ||
            "Payment failed. Please try again."
        );

        await reportPaymentFailure(
          newPayment.providerOrderId,
          failureResponse.error?.metadata?.payment_id
        );
      });

      checkout.open();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Payment retry failed."
      );
      setRetryingOrderId(null);
      await loadOrders();
    }
  };

  const paidOrders = orders.filter((order) => order.status === "PAID");

  const totalRevenue = paidOrders.reduce(
    (total, order) => total + Number(order.amount),
    0
  );

  const filteredOrders = orders.filter((order) => {
    const searchTerm = search.trim().toLowerCase();

    const matchesSearch =
      !searchTerm ||
      order.orderNumber.toLowerCase().includes(searchTerm) ||
      order.customer?.name?.toLowerCase().includes(searchTerm) ||
      order.customer?.email?.toLowerCase().includes(searchTerm) ||
      order.payments?.some((payment) =>
        payment.providerOrderId?.toLowerCase().includes(searchTerm)
      );

    const matchesStatus =
      statusFilter === "ALL" || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const activeProducts = products.filter((product) => product.active);

  const currentProduct = products.find(
    (product) => product.id === selectedProduct
  );

  return (
    <div className="space-y-8">
      <div>
        <p className="text-slate-400">Track and manage your payment orders</p>
        <h2 className="text-xl font-semibold mt-2">Order Management</h2>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-4">
          {error}
        </div>
      )}

      {message && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-400 rounded-lg p-4">
          {message}
        </div>
      )}

      <section className="bg-[#111827] border border-slate-800 rounded-xl p-6 space-y-5">
        <div>
          <h3 className="text-lg font-semibold">Create New Order</h3>
          <p className="text-sm text-slate-400 mt-1">
            Select a customer and product to start a payment.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm text-slate-400 mb-2">
              Select Customer
            </label>
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className="w-full bg-[#0d1423] border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-blue-500"
            >
              <option value="">Choose a customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} ({customer.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">
              Select Product
            </label>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="w-full bg-[#0d1423] border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-blue-500"
            >
              <option value="">Choose a product</option>
              {activeProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} —{" "}
                  {formatCurrency(product.price, product.currency)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {currentProduct && (
          <div className="bg-[#0d1423] rounded-lg p-4 flex justify-between items-center">
            <span className="text-slate-400 text-sm">Order Amount</span>
            <span className="text-xl font-bold">
              {formatCurrency(currentProduct.price, currentProduct.currency)}
            </span>
          </div>
        )}

        <button
          onClick={createOrderAndPay}
          disabled={
            checkoutLoading ||
            !selectedCustomer ||
            !selectedProduct ||
            activeProducts.length === 0 ||
            customers.length === 0
          }
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition"
        >
          {checkoutLoading ? "Processing..." : "Create Order & Pay"}
        </button>

        {customers.length === 0 && (
          <p className="text-sm text-yellow-400">
            Add a customer before creating an order.
          </p>
        )}

        {activeProducts.length === 0 && (
          <p className="text-sm text-yellow-400">
            Add an active product before creating an order.
          </p>
        )}
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-6">
          <p className="text-sm text-slate-400">Total Orders</p>
          <h3 className="text-2xl font-bold mt-3">{orders.length}</h3>
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-xl p-6">
          <p className="text-sm text-slate-400">Paid Orders</p>
          <h3 className="text-2xl font-bold mt-3 text-green-400">
            {paidOrders.length}
          </h3>
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-xl p-6">
          <p className="text-sm text-slate-400">Total Revenue</p>
          <h3 className="text-2xl font-bold mt-3">
            {formatCurrency(totalRevenue, "INR")}
          </h3>
        </div>
      </section>

      <section className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-slate-800 space-y-5">
          <div>
            <h3 className="text-lg font-semibold">All Orders</h3>
            <p className="text-sm text-slate-400 mt-1">
              {filteredOrders.length} orders found
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search order ID, customer name or email..."
              className="flex-1 bg-[#0d1423] border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-blue-500"
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#0d1423] border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="PAID">Paid</option>
              <option value="PENDING">Pending</option>
              <option value="CREATED">Created</option>
              <option value="FAILED">Failed</option>
            </select>

            <button
              onClick={loadOrders}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 rounded-lg text-sm disabled:opacity-50"
            >
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <p className="p-8 text-center text-slate-400">Loading orders...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#0d1423] text-slate-400">
                <tr>
                  <th className="p-4">Order ID</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Payment</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-t border-slate-800 hover:bg-slate-800/30"
                  >
                    <td className="p-4 font-medium whitespace-nowrap">
                      {order.orderNumber}
                    </td>

                    <td className="p-4">
                      <p className="font-medium">
                        {order.customer?.name || "Unknown"}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {order.customer?.email || "—"}
                      </p>
                    </td>

                    <td className="p-4 whitespace-nowrap">
                      {formatCurrency(order.amount, order.currency)}
                    </td>

                    <td className="p-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs ${getStatusStyle(order.status)}`}
                      >
                        {order.status}
                      </span>
                    </td>

                    <td className="p-4">
                      {order.payments?.length
                        ? order.payments[0].status
                        : "—"}
                    </td>

                    <td className="p-4 text-slate-400 whitespace-nowrap">
                      {new Date(order.createdAt).toLocaleDateString("en-IN")}
                    </td>

                    <td className="p-4">
                      {order.status === "FAILED" && (
                        <button
                          onClick={() => retryPayment(order)}
                          disabled={retryingOrderId !== null}
                          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap"
                        >
                          {retryingOrderId === order.id
                            ? "Retrying..."
                            : "Retry Payment"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}

                {filteredOrders.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="p-8 text-center text-slate-500"
                    >
                      No orders found.
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

export default Orders;