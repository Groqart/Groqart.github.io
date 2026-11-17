import type { MetaFunction } from 'react-router';
import { AdminPage } from '../pages/AdminPage';

export const meta: MetaFunction = () => {
  return [
    { title: 'Admin Moderation Console — NexusByte' },
    { name: 'description', content: 'NexusByte platform moderation, seller trust, and safety triage.' },
  ];
};

export default function AdminRoute() {
  return <AdminPage />;
}
