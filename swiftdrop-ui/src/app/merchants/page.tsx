"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/ui";
import { getJson } from "@/lib/api";
import type { MerchantResponse } from "@/types/api";

export default function MerchantsPage() {
  const [merchants, setMerchants] = useState<MerchantResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setMerchants(await getJson<MerchantResponse[]>("/api/v1/merchants"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Merchants request failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  return (
    <div>
      <PageHeader title="Merchants" description="Demo merchant locations from logistics service." action={<Button onClick={load}>Refresh</Button>} />
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} /> : null}
      {!loading && merchants.length === 0 ? <EmptyState message="No merchants found." /> : null}
      {merchants.length > 0 ? (
        <div className="overflow-x-auto rounded-md border border-slate-800">
          <table className="min-w-full divide-y divide-slate-800 text-sm">
            <thead className="bg-slate-900 text-left text-slate-400">
              <tr>{["id", "userId", "name", "latitude", "longitude"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-950">
              {merchants.map((merchant) => (
                <tr key={merchant.id}>
                  <td className="px-3 py-2 text-slate-300">{merchant.id}</td>
                  <td className="px-3 py-2 text-slate-300">{merchant.userId}</td>
                  <td className="px-3 py-2 text-white">{merchant.name}</td>
                  <td className="px-3 py-2 text-slate-300">{merchant.latitude}</td>
                  <td className="px-3 py-2 text-slate-300">{merchant.longitude}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
