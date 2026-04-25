import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getSessionUser() {
  const session = await getServerSession(authOptions);
  return session?.user ?? null;
}

export async function requireSession() {
  const user = await getSessionUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}

export async function requireBuyer() {
  const user = await requireSession();
  if (user.role !== "BUYER" && user.role !== "OPERATOR") throw new Error("FORBIDDEN");
  return user;
}

export async function requireOperator() {
  const user = await requireSession();
  if (user.role !== "OPERATOR") throw new Error("FORBIDDEN");
  return user;
}
