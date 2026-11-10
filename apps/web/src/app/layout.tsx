import type { Metadata } from "next";
import { Bebas_Neue, DM_Sans } from "next/font/google";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import "./globals.css";

const display = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display-face",
});

const body = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body-face",
});

export const metadata: Metadata = {
  title: {
    default: "DESAFIOS REAIS",
    template: "%s · DESAFIOS REAIS",
  },
  description:
    "O SEU DESAFIO. A SUA HISTÓRIA. Plataforma brasileira de entretenimento competitivo.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${display.variable} ${body.variable} font-body antialiased`}>
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
