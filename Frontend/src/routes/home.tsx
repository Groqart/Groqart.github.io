import type { MetaFunction } from "react-router";
import { MarketplacePage } from "../pages/MarketplacePage";

export const meta: MetaFunction = () => {
  return [
    { title: "NexusByte — Digital Goods Marketplace & Crypto Settlement" },
    { name: "description", content: "Buy and sell developer boilerplates, trading bots, scripts and 3D assets with instant NOWPayments crypto checkout." },
    { property: "og:title", content: "NexusByte Marketplace" },
    { property: "og:type", content: "website" },
  ];
};

export default function HomeRoute() {
  return <MarketplacePage />;
}
