import type { Metadata } from "next";
import "./global.css";

export const metadata: Metadata = {
  title: "People Hub - HRMS SaaS Platform",
  description: "Enterprise multi-tenant, multi-industry Human Resource Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-800 antialiased">
        {children}
      </body>
    </html>
  );
}
