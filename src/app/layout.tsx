import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../styles/globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Epatta Coffee & Tea - Quản lý ca làm việc",
  description: "Hệ thống quản lý ca làm việc chuỗi Epatta Coffee & Tea",
}

import { StoreProvider } from '@/contexts/StoreContext';
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ToastProvider } from "@/components/providers/toast-provider";
import { ScheduleAutoCompleter } from "@/components/shared/ScheduleAutoCompleter";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <meta name="application-name" content="Epatta" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Epatta" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
      </head>
      <body className={inter.className + " bg-gray-50 min-h-screen dark:bg-gray-900 duration-200"}>
        <StoreProvider>
          <ScheduleAutoCompleter />
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
          <ToastProvider />
        </StoreProvider>
      </body>
    </html>
  );
}
