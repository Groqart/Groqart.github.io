import type { MetaFunction } from 'react-router';
import { LegalDocumentLayout, type LegalSection } from '../components/LegalDocumentLayout';

export const meta: MetaFunction = () => [
  { title: 'Terms of Service — ZenxusBay' },
  {
    name: 'description',
    content:
      'Terms of Service governing buyers, creators, custom storefronts, digital licenses, and cryptocurrency settlements on ZenxusBay.',
  },
];

const TERMS_SECTIONS: LegalSection[] = [
  {
    id: 'acceptance',
    title: '1. Acceptance of Terms',
    paragraphs: [
      'By accessing ZenxusBay, purchasing digital goods, or operating a creator storefront, you agree to these Terms of Service and all applicable marketplace rules.',
    ],
  },
  {
    id: 'digital-products-licenses',
    title: '2. Digital Goods & Licensing',
    paragraphs: [
      'All items listed on ZenxusBay are intangible digital assets (software, scripts, templates, 3D models, APIs, and license keys). Each purchase grants the license scope specified on the listing (such as Single, Commercial, or Enterprise tier).',
    ],
    bullets: [
      'Unauthorized redistribution, resale, or public sharing of paid archives or license keys is prohibited.',
      'Download links generated after settlement are time-limited and can be regenerated from My Library.',
    ],
  },
  {
    id: 'crypto-payments',
    title: '3. Cryptocurrency Checkout & Finality',
    paragraphs: [
      'Payments are settled on-chain via supported cryptocurrency networks through NOWPayments or a merchant’s configured gateway. Because blockchain transfers are irreversible once confirmed and digital goods are delivered immediately upon settlement, completed digital purchases are generally non-refundable unless the delivered asset is materially defective or misrepresented.',
    ],
  },
  {
    id: 'vendor-responsibilities',
    title: '4. Creator & Storefront Obligations',
    paragraphs: [
      'Creators are solely responsible for the originality, legality, security, and accurate description of all software, files, and storefronts published on ZenxusBay.',
    ],
    bullets: [
      'Listings containing malware, stolen intellectual property, credential harvesters, or prohibited content will be rejected or removed.',
      'Vendors must maintain accurate payout wallet addresses and adhere to DNS verification requirements for custom domains.',
    ],
  },
  {
    id: 'limitation-of-liability',
    title: '5. Platform Availability & Liability',
    paragraphs: [
      'ZenxusBay provides marketplace infrastructure on an "as is" and "as available" basis. To the fullest extent permitted by law, ZenxusBay is not liable for indirect or consequential damages, blockchain network congestion, or third-party wallet errors.',
    ],
  },
];

export default function TermsOfServiceRoute() {
  return (
    <LegalDocumentLayout
      docType="terms"
      title="Terms of Service"
      subtitle="Rules and licensing terms for purchasing digital goods, settling cryptocurrency payments, and launching storefronts on ZenxusBay."
      effectiveDate="November 22, 2026"
      sections={TERMS_SECTIONS}
    />
  );
}
