import { CustomerOrderDetailPage } from "@/components/portal/PortalDetailViews";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CustomerOrderDetailPage orderId={id} />;
}
