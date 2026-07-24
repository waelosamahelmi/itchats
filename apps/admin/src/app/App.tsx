import { Routes, Route } from 'react-router-dom';
import AdminDashboard from '@/features/admin/AdminDashboard';

export default function AdminApp() {
  return (
    <Routes>
      <Route path="*" element={<AdminDashboard />} />
    </Routes>
  );
}
