"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ArrowLeft, Loader2, CheckCircle, XCircle, 
  Clock, Search, Filter, ChevronDown 
} from "lucide-react";

export const dynamic = "force-dynamic";

interface TransactionLog {
  id: string;
  orderId: string | null;
  txRef: string | null;
  flwRef: string | null;
  amount: number | null;
  status: string;
  responseCode: string | null;
  responseData: string | null;
  webhookData: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export default function AdminTransactionsPage() {
  const [logs, setLogs] = useState<TransactionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/admin/transactions");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error("Failed to fetch transaction logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    if (status.includes("successful") || status === "step:PAID") {
      return <CheckCircle className="text-green-600" size={16} />;
    }
    if (status.includes("failed") || status.includes("FAILED")) {
      return <XCircle className="text-red-600" size={16} />;
    }
    return <Clock className="text-yellow-600" size={16} />;
  };

  const getStatusColor = (status: string) => {
    if (status.includes("successful") || status === "step:PAID") return "text-green-600";
    if (status.includes("failed") || status.includes("FAILED")) return "text-red-600";
    return "text-yellow-600";
  };

  const filteredLogs = logs.filter((log) => {
    const matchesFilter = filter === "all" || log.status.includes(filter);
    const matchesSearch = 
      search === "" || 
      log.txRef?.toLowerCase().includes(search.toLowerCase()) ||
      log.flwRef?.toLowerCase().includes(search.toLowerCase()) ||
      log.orderId?.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatAmount = (amount: number | null) => {
    if (amount === null) return "N/A";
    return `₦${amount.toLocaleString()}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/admin"
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <ArrowLeft size={20} />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Transaction Logs</h1>
                <p className="text-sm text-gray-500">View all payment transactions</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="bg-white rounded-lg border p-4 mb-6 flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search by txRef, flwRef, or orderId..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="relative">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="appearance-none pr-10 pl-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="all">All Status</option>
              <option value="successful">Successful</option>
              <option value="failed">Failed</option>
              <option value="step">Processing Steps</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-blue-600" size={32} />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border">
            <Clock className="mx-auto text-gray-300 mb-4" size={48} />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No transaction logs found</h3>
            <p className="text-gray-500">Transaction logs will appear here once payments are processed</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">txRef</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">flwRef</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(log.status)}
                          <span className={`text-sm font-medium ${getStatusColor(log.status)}`}>
                            {log.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {log.txRef || "N/A"}
                        </code>
                      </td>
                      <td className="px-4 py-3">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {log.flwRef || "N/A"}
                        </code>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">
                        {formatAmount(log.amount)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {log.ipAddress || "N/A"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => {
                            const details = {
                              status: log.status,
                              responseCode: log.responseCode,
                              responseData: log.responseData,
                              webhookData: log.webhookData,
                            };
                            alert(JSON.stringify(details, null, 2));
                          }}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
