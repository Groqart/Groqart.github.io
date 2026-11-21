import type { MetaFunction } from 'react-router';
import { MarketplacePage } from '../pages/MarketplacePage';

export const meta: MetaFunction = () => {
  return [
    { title: 'ZenxusBay — Digital Goods Marketplace & Crypto Checkout' },
    {
      name: 'description',
      content:
        'Buy and sell developer boilerplates, trading bots, scripts and 3D assets on ZenxusBay with instant NOWPayments crypto checkout.',
    },
    { property: 'og:title', content: 'ZenxusBay Marketplace' },
    { property: 'og:type', content: 'website' },
  ];
};

export default function HomeRoute() {
  return <MarketplacePage />;
}
