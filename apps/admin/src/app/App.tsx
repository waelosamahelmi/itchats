import { Routes, Route } from 'react-router-dom';

function Dashboard() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 text-white">
      <div className="text-center">
        <h1 className="text-3xl font-bold">ItChats Admin</h1>
        <p className="mt-2 text-gray-400">Admin panel coming soon.</p>
      </div>
    </div>
  );
}

export default function AdminApp() {
  return (
    <Routes>
      <Route path="*" element={<Dashboard />} />
    </Routes>
  );
}
