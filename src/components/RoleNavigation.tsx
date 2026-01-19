import Link from "next/link";

export default function RoleNavigation() {
  return (
    <nav className="flex gap-4 p-4 bg-gray-100 rounded mb-6">
      <Link href="/admin" className="font-medium text-blue-700 hover:underline">Admin</Link>
      <Link href="/manager" className="font-medium text-green-700 hover:underline">Manager</Link>
      <Link href="/employee" className="font-medium text-amber-700 hover:underline">Employee</Link>
    </nav>
  );
}
