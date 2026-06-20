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
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/ui";
import {
  AdminDataTable,
  AdminIdChip,
  AdminMetricCard,
  AdminPageHeader,
  AdminSectionCard,
  AdminTableCell,
  AdminViewAction,
} from "@/components/admin/ui";
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
    <div className="p-6 space-y-5">
      <AdminPageHeader
        icon="ME"
        title="Merchants"
        description="Store records and location data."
        action={<Button onClick={load}>Refresh</Button>}
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <div className="grid gap-4 sm:grid-cols-3">
          <AdminMetricCard label="Total Merchants" value={merchants.length} icon="T" />
          <AdminMetricCard
            label="Featured Merchant"
            value={merchants[0]?.name ?? "-"}
            hint={merchants[0]?.id ? shortId(merchants[0].id) : undefined}
            tone="violet"
            icon="F"
            compact
          />
          <AdminMetricCard
            label="Active Locations"
            value={merchants.length}
            hint={activeDemoLocation ? "Demo location available" : "Demo location unavailable"}
            tone="emerald"
            icon="L"
          />
        </div>
        <AdminSectionCard title="Delivery Location">
          <p className="text-sm leading-6 text-slate-600">
            Merchant location is used for nearby driver assignment.
          </p>
        </AdminSectionCard>
      </div>

      <div className="grid gap-4">
        <AdminSectionCard
          title="Merchant List"
          description="Active merchant records."
          action={
            <span className="w-fit rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700">
              Demo merchant: {shortId(demoMerchantId)}
            </span>
          }
        >

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
            <AdminDataTable
              columns={["Merchant ID", "User ID", "Name", "Latitude", "Longitude", "Actions"]}
              rows={merchants}
              emptyMessage="No merchants found."
              getRowKey={(merchant) => merchant.id}
              renderRow={(merchant) => (
                <>
                  <AdminTableCell title={merchant.id}>
                    <div className="flex flex-col gap-1">
                      <AdminIdChip value={shortId(merchant.id)} />
                      {merchant.id === demoMerchantId ? (
                        <span className="w-fit rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs text-blue-700">
                          Demo Order
                        </span>
                      ) : null}
                    </div>
                  </AdminTableCell>
                  <AdminTableCell title={merchant.userId}><span className="font-mono text-xs text-slate-400">{shortId(merchant.userId)}</span></AdminTableCell>
                  <AdminTableCell strong>
                    <span className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50 text-xs font-semibold text-violet-700">
                        M
                      </span>
                      {merchant.name}
                    </span>
                  </AdminTableCell>
                  <AdminTableCell>{merchant.latitude}</AdminTableCell>
                  <AdminTableCell>{merchant.longitude}</AdminTableCell>
                  <AdminTableCell>
                    <AdminViewAction
                      onClick={() => {
                        setSelectedMerchant(merchant);
                        setDetailModalOpen(true);
                      }}
                    />
                  </AdminTableCell>
                </>
              )}
            />
          ) : null}
        </AdminSectionCard>
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

function shortId(value?: string) {
  if (!value) {
    return "-";
  }

  return value.length > 13 ? `${value.slice(0, 8)}...${value.slice(-4)}` : value;
}
