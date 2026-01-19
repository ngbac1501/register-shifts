import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../styles/globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Epatta Coffee & Tea - Đăng nhập",
  description: "Quản lý ca làm việc chuỗi Epatta Coffee & Tea",
};

import { ThemeProvider } from "@/components/providers/theme-provider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={inter.className + " bg-gray-50 min-h-screen dark:bg-gray-900 duration-200"}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
