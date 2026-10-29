import LoginForm from "@/components/admin/LoginForm";
export const metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};
export default async function BlogLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  const configured = !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.ADMIN_ALLOWED_EMAIL
  );
  return <LoginForm configured={configured} recoveryCode={code} />;
}
