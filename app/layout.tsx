import DeployButton from "@/components/deploy-button";
import { EnvVarWarning } from "@/components/env-var-warning";
import HeaderAuth from "@/components/header-auth";
import { hasEnvVars } from "@/utils/supabase/check-env-vars";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import Link from "next/link";
import HomeLink from "@/components/home-link";
import { HeaderNav } from "@/components/header-nav";
import "./globals.css";
import "nprogress/nprogress.css";
import { NavigationEvents } from "@/components/navigation-events";
import NProgress from "nprogress";

// Configure NProgress to complete instantly
NProgress.configure({
  showSpinner: false,
  trickleSpeed: 1,
  minimum: 0.99,
  easing: 'ease',
  speed: 1
});

const defaultUrl = process.env.VERCEL_URL
	? `https://${process.env.VERCEL_URL}`
	: "http://localhost:3000";

export const metadata = {
	metadataBase: new URL(defaultUrl),
	title: "Suraksha AI — Hospital Security Intelligence",
	description: "AI-powered hospital security platform. Detect patient aggression, staff misconduct, and safety violations in real-time.",
};

const geistSans = Geist({
	display: "swap",
	subsets: ["latin"],
});

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" className={geistSans.className} suppressHydrationWarning>
			<body className="bg-background text-foreground" suppressHydrationWarning>
				<NavigationEvents />
				<ThemeProvider
					attribute="class"
					defaultTheme="dark"
					enableSystem
					disableTransitionOnChange
				>
					<main className="min-h-screen flex flex-col items-center">
						<div className="flex-1 w-full flex flex-col items-center">
							<nav className="fixed top-0 left-0 right-0 z-[100] w-full flex justify-center border-b border-white/10 bg-black/40 backdrop-blur-md h-16">
								<div className="w-full max-w-7xl flex justify-between items-center p-3 px-4 sm:px-8 text-sm">
									<div className="flex items-center gap-2 sm:gap-12">
										<HomeLink />
										<div className="flex items-center">
											<HeaderNav />
										</div>
									</div>
									<div className="flex items-center gap-2 sm:gap-4">
										<HeaderAuth />
									</div>
								</div>
							</nav>
							<div className="w-full pt-16">
								{children}
							</div>
						</div>
					</main>
				</ThemeProvider>
			</body>
		</html>
	);
}
