import { Inter } from "next/font/google";
import type { ReactNode } from "react";

const inter = Inter({ subsets: ["latin"] });

export default function LoginLayout({ children }: { children: ReactNode }) {
  return <div className={inter.className}>{children}</div>;
}
