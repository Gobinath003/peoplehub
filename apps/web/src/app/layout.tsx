import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./global.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PeopleHub | Noltrion Innovations - Enterprise HRMS Suite",
  description: "Enterprise multi-tenant, multi-industry Human Resource Management System by Noltrion Innovations",
  icons: {
    icon: "/noltrion-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-slate-50 text-slate-900 font-sans antialiased text-sm">
        {children}
      </body>
    </html>
  );
}
