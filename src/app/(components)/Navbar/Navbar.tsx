import { getServerSession } from "next-auth";
import { authOptions } from "../../api/auth/[...nextauth]/route";
import type { SessionUserClient } from "../../../types/User/JWT.types";
import NavbarClient from "./NavbarClient";

export default async function Navbar() {
  const session = await getServerSession(authOptions);

  const user: SessionUserClient | null = session?.user
    ? {
        id: session.user.id ?? "",
        name: session.user.name ?? "User",
        email: session.user.email ?? "",
        image: session.user.image ?? null,
        role: session.user.role ?? "customer",
        status: session.user.status ?? "active",
        profile_completed: Boolean(session.user.profile_completed),
      }
    : null;

  return <NavbarClient user={user} />;
}
