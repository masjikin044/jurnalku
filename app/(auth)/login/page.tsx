import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import AuthForm from "@/components/AuthForm";
import { login } from "@/app/actions/auth";

export const metadata: Metadata = { title: "Masuk" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const registrationOpen = process.env.ALLOW_REGISTRATION !== "false";

  return (
    <>
      <SiteHeader />
      <main className="px-4 py-14">
        <AuthForm
          mode="login"
          action={login}
          next={next}
          registrationOpen={registrationOpen}
          initialError={error === "callback" ? "Link konfirmasi tidak valid atau kedaluwarsa." : undefined}
        />
      </main>
    </>
  );
}
