"use client";

import { SessionUserClient } from "../../../types/User/JWT.types";

export default function AppShell({
  user: _user,
  children,
}: {
  user: SessionUserClient | null;
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
