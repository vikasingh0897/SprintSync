import type { Metadata } from "next";
import "./globals.css";

import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { Footer } from '../components/Footer';
import { AuthProvider } from '../context/AuthContext';

export const metadata: Metadata = {
  title: "SprintSync — Modern Project Management",
  description: "SprintSync is the modern project management platform for high-performance teams. Manage tasks, track performance, and ship faster.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased bg-[#0c0e17] text-white selection:bg-indigo-500/30 selection:text-indigo-200 flex flex-col min-h-screen">
        <AuthProvider>
          <Header />
          <div className="flex-1 pb-16 md:pb-0">
            {children}
          </div>
          <BottomNav />
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
