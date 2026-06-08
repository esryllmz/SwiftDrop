"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AdminButton,
  AdminModal,
  AdvancedDetails,
  DetailField,
  DetailGrid,
  JsonPreview,
  ModalFooter,
} from "@/components/admin/modal";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
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
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getJson<MerchantResponse[]>("/api/v1/merchants", undefined, accessToken);
      setMerchants(response);
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
        description="Store records and delivery locations."
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
          <h3 className="text-lg font-semibold text-slate-950">Delivery Location</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Merchant coordinates are used by logistics when assigning nearby drivers.
          </p>
        </Card>
      </div>

      <div className="grid gap-4">
        <Card>
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">
                Merchant List
              </h3>
              <p className="mt-1 text-sm text-slate-600">Active merchant records.</p>
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
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
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
                <tbody className="divide-y divide-slate-100 bg-white">
                  {merchants.map((merchant) => (
                    <tr key={merchant.id} className="transition hover:bg-slate-50">
                      <td
                        className="px-3 py-2 text-slate-700"
                        title={merchant.id}
                      >
                        <div className="flex flex-col gap-1">
                          <span>{shortId(merchant.id)}</span>
                          {merchant.id === demoMerchantId ? (
                            <span className="w-fit rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs text-blue-700">
                              Demo Order
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
                          onClick={() => {
                            setSelectedMerchant(merchant);
                            setDetailModalOpen(true);
                          }}
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
      </div>

      <AdminModal
        open={detailModalOpen}
        title="Merchant Detail"
        subtitle={selectedMerchant?.name}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedMerchant(null);
        }}
        footer={
          <ModalFooter>
            <AdminButton
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => {
                setDetailModalOpen(false);
                setSelectedMerchant(null);
              }}
            >
              Close
            </AdminButton>
          </ModalFooter>
        }
      >
        {selectedMerchant ? (
          <div className="grid gap-4">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm leading-6 text-blue-900">
              Merchant location is used for driver proximity matching.
            </div>
            <DetailGrid>
              <DetailField label="Merchant ID" value={selectedMerchant.id} mono />
              <DetailField label="User ID" value={selectedMerchant.userId} mono />
              <DetailField label="Name" value={selectedMerchant.name} />
              <DetailField label="Latitude" value={String(selectedMerchant.latitude)} />
              <DetailField label="Longitude" value={String(selectedMerchant.longitude)} />
            </DetailGrid>
            <AdvancedDetails>
              <JsonPreview value={selectedMerchant} />
            </AdvancedDetails>
          </div>
        ) : (
          <EmptyState message="No merchant selected." />
        )}
      </AdminModal>
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
