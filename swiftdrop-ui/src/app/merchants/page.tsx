"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  JsonBlock,
  LoadingState,
  PageHeader,
  SecondaryButton,
} from "@/components/ui";
import { useAuth } from "@/components/auth/AuthProvider";
import { getJson } from "@/lib/api";
import type { MerchantResponse } from "@/types/api";

const demoMerchantId = "11111111-1111-1111-1111-111111111111";

export default function MerchantsPage() {
  const { accessToken } = useAuth();
  const [merchants, setMerchants] = useState<MerchantResponse[]>([]);
  const [selectedMerchant, setSelectedMerchant] =
    useState<MerchantResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getJson<MerchantResponse[]>("/api/v1/merchants", undefined, accessToken);
      setMerchants(response);
      setSelectedMerchant((current) => current ?? response[0] ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Merchants request failed");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const activeDemoLocation = useMemo(
    () => merchants.some((merchant) => merchant.id === demoMerchantId),
    [merchants],
  );

  return (
    <div>
      <PageHeader
        title="Merchants"
        description="Demo merchant locations used by logistics order flow."
        action={<Button onClick={load}>Refresh</Button>}
      />

      <div className="mb-4 grid gap-4 xl:grid-cols-[1fr_420px]">
        <div className="grid gap-4 sm:grid-cols-2">
          <SummaryCard label="Total Merchants" value={merchants.length} />
          <Card>
            <div className="text-sm text-slate-600">Active Demo Location</div>
            <div className="mt-2 text-3xl font-semibold text-slate-950">
              {activeDemoLocation ? "Yes" : "No"}
            </div>
            <div className="mt-2 break-all text-xs text-slate-500">
              {demoMerchantId}
            </div>
          </Card>
        </div>
        <Card>
          <h3 className="text-lg font-semibold text-slate-950">Geo Search Input</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Merchant location is used as the center point for Redis Geo driver
            search.
          </p>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <Card>
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">
                Merchant List
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                Seeded demo merchants from Logistics Service.
              </p>
            </div>
            <span className="w-fit rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700">
              Demo merchant: {shortId(demoMerchantId)}
            </span>
          </div>

          {loading ? <LoadingState /> : null}
          {error ? (
            <div className="mb-4">
              <ErrorState message={error} />
            </div>
          ) : null}
          {!loading && merchants.length === 0 ? (
            <EmptyState message="No merchants found. Check Logistics seed data or service health." />
          ) : null}
          {merchants.length > 0 ? (
            <div className="overflow-x-auto rounded-md border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-white text-left text-slate-600">
                  <tr>
                    {[
                      "Merchant ID",
                      "User ID",
                      "Name",
                      "Latitude",
                      "Longitude",
                      "Actions",
                    ].map((heading) => (
                      <th key={heading} className="px-3 py-2 font-medium">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {merchants.map((merchant) => (
                    <tr key={merchant.id}>
                      <td
                        className="px-3 py-2 text-slate-700"
                        title={merchant.id}
                      >
                        <div className="flex flex-col gap-1">
                          <span>{shortId(merchant.id)}</span>
                          {merchant.id === demoMerchantId ? (
                            <span className="w-fit rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs text-blue-700">
                              Use for Demo Order
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td
                        className="px-3 py-2 text-slate-700"
                        title={merchant.userId}
                      >
                        {shortId(merchant.userId)}
                      </td>
                      <td className="px-3 py-2 text-slate-950">{merchant.name}</td>
                      <td className="px-3 py-2 text-slate-700">
                        {merchant.latitude}
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {merchant.longitude}
                      </td>
                      <td className="px-3 py-2">
                        <SecondaryButton
                          onClick={() => setSelectedMerchant(merchant)}
                        >
                          View
                        </SecondaryButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </Card>

        <Card className="h-fit">
          <h3 className="text-lg font-semibold text-slate-950">Merchant Detail</h3>
          <p className="mt-1 text-sm text-slate-600">
            Select a merchant to inspect the location payload.
          </p>
          {!selectedMerchant ? (
            <div className="mt-4">
              <EmptyState message="Select a merchant from the table." />
            </div>
          ) : (
            <div className="mt-4 grid gap-4">
              <dl className="grid gap-3 text-sm">
                <DetailRow label="id" value={selectedMerchant.id} />
                <DetailRow label="userId" value={selectedMerchant.userId} />
                <DetailRow label="name" value={selectedMerchant.name} />
                <DetailRow
                  label="latitude"
                  value={String(selectedMerchant.latitude)}
                />
                <DetailRow
                  label="longitude"
                  value={String(selectedMerchant.longitude)}
                />
              </dl>
              <JsonBlock value={selectedMerchant} />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <div className="text-sm text-slate-600">{label}</div>
      <div className="mt-2 text-3xl font-semibold text-slate-950">{value}</div>
    </Card>
  );
}

function shortId(value?: string) {
  if (!value) {
    return "-";
  }

  return value.length > 13 ? `${value.slice(0, 8)}...${value.slice(-4)}` : value;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 rounded-md border border-slate-200 bg-white p-3">
      <dt className="text-xs uppercase text-slate-500">{label}</dt>
      <dd className="break-all text-slate-200">{value}</dd>
    </div>
  );
}
