import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/providers";

export const metadata: Metadata = {
  title: "ProjectFlow",
  description: "Project management with real-time collaboration",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-[#09090b] text-[#fafafa] antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
