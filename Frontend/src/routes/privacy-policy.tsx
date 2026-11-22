import type { MetaFunction } from 'react-router';
import { LegalDocumentLayout, type LegalSection } from '../components/LegalDocumentLayout';

export const meta: MetaFunction = () => [
  { title: 'Privacy Policy — ZenxusBay' },
  {
    name: 'description',
    content:
      'Privacy Policy explaining how ZenxusBay collects, processes, and protects account, order, crypto checkout, and digital delivery data.',
  },
];

const PRIVACY_SECTIONS: LegalSection[] = [
  {
    id: 'information-we-collect',
    title: '1. Information We Collect',
    paragraphs: [
      'ZenxusBay collects only the minimum information required to operate a secure digital goods marketplace, issue license keys, and deliver purchased files.',
    ],
    bullets: [
      'Account & Checkout Email: Used for passwordless Magic Link authentication, order receipts, and My Library delivery access.',
      'Vendor & Storefront Details: Display names, store slugs, custom domain verification records, and cryptocurrency payout wallet addresses.',
      'Order & Payment Metadata: Invoice identifiers, selected cryptocurrency network, settlement status, and cryptographic license keys.',
    ],
  },
  {
    id: 'how-we-use-data',
    title: '2. How We Use Information',
    paragraphs: [
      'We use collected data strictly to provide marketplace functionality, prevent fraud, and support buyers and creators.',
    ],
    bullets: [
      'Authenticate sessions via signed stateless tokens and Magic Link verification.',
      'Confirm cryptocurrency settlements with payment processors such as NOWPayments before unlocking downloads.',
      'Enforce archive safety scans, moderation policies, and license verification checks.',
    ],
  },
  {
    id: 'storage-and-security',
    title: '3. Data Storage, Security & Retention',
    paragraphs: [
      'Digital packages are stored in access-controlled object storage and served only through short-lived signed download URLs after verified settlement. Session tokens and theme preferences are stored locally in your browser.',
      'We do not sell personal data or buyer email addresses to third-party advertisers or data brokers.',
    ],
  },
  {
    id: 'third-party-services',
    title: '4. Third-Party Payment & Delivery Providers',
    paragraphs: [
      'When you initiate a cryptocurrency checkout or visit an independent vendor storefront, payment settlement is processed by the configured gateway (such as NOWPayments) subject to that gateway’s compliance and security standards.',
    ],
  },
  {
    id: 'your-rights',
    title: '5. Your Rights & Contact',
    paragraphs: [
      'You may request access to, correction of, or deletion of your account data and storefront profile at any time. For privacy inquiries or removal requests, contact the ZenxusBay support team via your account email or vendor portal.',
    ],
  },
];

export default function PrivacyPolicyRoute() {
  return (
    <LegalDocumentLayout
      docType="privacy"
      title="Privacy Policy"
      subtitle="How ZenxusBay handles your email address, crypto checkout metadata, license keys, and digital storefront information."
      effectiveDate="November 22, 2026"
      sections={PRIVACY_SECTIONS}
    />
  );
}
