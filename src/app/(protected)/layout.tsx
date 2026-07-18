import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db/mongoose";
import { getSession } from "@/lib/auth/session";
import { AppShell } from "@/components/shared/AppShell";
import { User, toSafeUser } from "@/models/User";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  await connectDB();
  const user = await User.findById(session.sub);
  if (!user) {
    redirect("/login");
  }

  return <AppShell user={toSafeUser(user)}>{children}</AppShell>;
}
