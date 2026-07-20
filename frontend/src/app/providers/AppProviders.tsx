import type { ReactNode } from "react";
import { AuthProvider } from "@/shared/auth";

type Props = {
  children: ReactNode;
};

export function AppProviders({ children }: Props) {
  return <AuthProvider>{children}</AuthProvider>;
}
