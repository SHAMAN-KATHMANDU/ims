import { Metadata } from "next";
import WebsiteOrderDetailClient from "./WebsiteOrderDetailClient";

export const metadata: Metadata = {
  title: "Website Order",
};

type Props = {
  params: Promise<{ workspace: string; id: string }>;
};

export default async function WebsiteOrderDetailRoute({ params }: Props) {
  const { workspace, id } = await params;
  return <WebsiteOrderDetailClient id={id} workspace={workspace} />;
}
