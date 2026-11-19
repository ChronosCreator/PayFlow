
  import { useEffect, useState } from "react";

  interface ProductsProps {
    token: string;
  }

  interface Product {
    id: string;
    name: string;
    description?: string;
    price: number | string;
    currency: string;
    active: boolean;
    createdAt: string;
  }

  
const API_BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

const API = API_BASE_URL
  ? API_BASE_URL.endsWith("/api")
    ? API_BASE_URL
    : `${API_BASE_URL}/api`
  : "/api";


  function Products({ token }: ProductsProps) {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState("");
    const [currency, setCurrency] = useState("INR");

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    const loadProducts = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API}/products`, {
          headers,
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "Failed to load products");
        }

        setProducts(result.data);
        setError("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      loadProducts();
    }, [token]);

    const resetForm = () => {
      setName("");
      setDescription("");
      setPrice("");
      setCurrency("INR");
      setEditingId(null);
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (!name.trim() || !price || Number(price) <= 0) {
        setError("Enter a product name and a valid price.");
        return;
      }

      try {
        const url = editingId
          ? `${API}/products/${editingId}`
          : `${API}/products`;

        const response = await fetch(url, {
          method: editingId ? "PATCH" : "POST",
          headers,
          body: JSON.stringify({
            name,
            description,
            price: Number(price),
            currency,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "Unable to save product");
        }

        resetForm();
        await loadProducts();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    };

    const handleEdit = (product: Product) => {
      setEditingId(product.id);
      setName(product.name);
      setDescription(product.description || "");
      setPrice(String(product.price));
      setCurrency(product.currency);
      setError("");
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleDelete = async (id: string) => {
      if (!window.confirm("Are you sure you want to delete this product?")) {
        return;
      }

      try {
        const response = await fetch(`${API}/products/${id}`, {
          method: "DELETE",
          headers,
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "Unable to delete product");
        }

        await loadProducts();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    };

    const handleToggle = async (product: Product) => {
      try {
        const response = await fetch(`${API}/products/${product.id}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({ active: !product.active }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "Unable to update product");
        }

        await loadProducts();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    };

    const formatPrice = (price: number | string, currency: string) =>
      new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }).format(Number(price));

    return (
      <div className="space-y-8">
        <header>
          <p className="text-sm text-slate-400">Manage your catalogue</p>
          <h1 className="text-3xl font-bold mt-1">Products</h1>
          <p className="text-slate-400 mt-2">
            Create and manage the products you sell.
          </p>
        </header>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-lg">
            {error}
          </div>
        )}

        <section className="bg-[#111827] border border-slate-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-5">
            {editingId ? "Edit Product" : "Add New Product"}
          </h2>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm text-slate-300 mb-2">
                Product Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Premium Subscription"
                className="w-full bg-[#080d19] border border-slate-700 rounded-lg p-3 outline-none focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-2">
                Price
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="499"
                className="w-full bg-[#080d19] border border-slate-700 rounded-lg p-3 outline-none focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-2">
                Description
              </label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your product"
                className="w-full bg-[#080d19] border border-slate-700 rounded-lg p-3 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-2">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-[#080d19] border border-slate-700 rounded-lg p-3 outline-none focus:border-blue-500"
              >
                <option value="INR">INR - Indian Rupee</option>
                <option value="USD">USD - US Dollar</option>
              </select>
            </div>

            <div className="md:col-span-2 flex gap-3">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-lg font-medium"
              >
                {editingId ? "Save Changes" : "Create Product"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="border border-slate-700 px-6 py-3 rounded-lg"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-slate-800 flex justify-between">
            <div>
              <h2 className="text-lg font-semibold">Your Products</h2>
              <p className="text-sm text-slate-500 mt-1">
                {products.length} products found
              </p>
            </div>

            <button
              onClick={loadProducts}
              className="text-blue-400 text-sm hover:text-blue-300"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <p className="p-8 text-center text-slate-400">Loading products...</p>
          ) : products.length === 0 ? (
            <p className="p-8 text-center text-slate-400">
              No products yet. Create your first product above.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#0d1423] text-slate-400">
                  <tr>
                    <th className="p-4">Product</th>
                    <th className="p-4">Price</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} className="border-t border-slate-800">
                      <td className="p-4">
                        <p className="font-medium">{product.name}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {product.description || "No description"}
                        </p>
                      </td>

                      <td className="p-4">
                        {formatPrice(product.price, product.currency)}
                      </td>

                      <td className="p-4">
                        <button
                          onClick={() => handleToggle(product)}
                          className={`px-3 py-1 rounded-full text-xs ${
                            product.active
                              ? "bg-green-500/10 text-green-400"
                              : "bg-red-500/10 text-red-400"
                          }`}
                        >
                          {product.active ? "Active" : "Inactive"}
                        </button>
                      </td>

                      <td className="p-4">
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleEdit(product)}
                            className="text-blue-400 hover:text-blue-300"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    );
  }

  export default Products;
