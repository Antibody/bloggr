import AdminWorkspace from "@/components/admin/AdminWorkspace";
export const metadata = {
  title: "Author workspace",
  robots: { index: false, follow: false },
};
export default function AdminPage() {
  return <AdminWorkspace />;
}
