"use client";

import React, { useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState("demo@example.com");
  const [isDevMode, setIsDevMode] = useState(true); // Default to true for easier testing

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  const handleSignIn = () => {
    signIn("azure-ad", { callbackUrl: "/dashboard" });
  };

  const handleDevSignIn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      const result = await signIn("credentials", {
        email: email || "demo@example.com",
        redirect: false,
      });
      if (result?.ok) {
        router.push("/dashboard");
        router.refresh(); // Refresh to update session
      } else if (result?.error) {
        console.error("Login error:", result.error);
        alert("Login failed: " + result.error);
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("Login failed. Please try again.");
    }
  };

  const handleQuickLogin = async () => {
    try {
      const result = await signIn("credentials", {
        email: "demo@example.com",
        redirect: false,
      });
      if (result?.ok) {
        router.push("/dashboard");
      } else if (result?.error) {
        console.error("Login error:", result.error);
        alert("Login failed. Please try again.");
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("Login failed. Please try again.");
    }
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Study Planner
            </h1>
            <p className="text-gray-600">
              Sign in to manage your study schedules
            </p>
          </div>

          {/* Azure AD Login */}
          {!isDevMode && (
            <Button
              onClick={handleSignIn}
              variant="primary"
              size="lg"
              className="w-full"
            >
              <svg
                className="w-5 h-5 mr-2"
                viewBox="0 0 23 23"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M11.5 0C5.149 0 0 5.149 0 11.5C0 17.851 5.149 23 11.5 23C17.851 23 23 17.851 23 11.5C23 5.149 17.851 0 11.5 0Z"
                  fill="#F25022"
                />
                <path
                  d="M11.5 0C5.149 0 0 5.149 0 11.5C0 17.851 5.149 23 11.5 23C17.851 23 23 17.851 23 11.5C23 5.149 17.851 0 11.5 0Z"
                  fill="#7FBA00"
                />
                <path
                  d="M11.5 0C5.149 0 0 5.149 0 11.5C0 17.851 5.149 23 11.5 23C17.851 23 23 17.851 23 11.5C23 5.149 17.851 0 11.5 0Z"
                  fill="#00A4EF"
                />
                <path
                  d="M11.5 0C5.149 0 0 5.149 0 11.5C0 17.851 5.149 23 11.5 23C17.851 23 23 17.851 23 11.5C23 5.149 17.851 0 11.5 0Z"
                  fill="#FFB900"
                />
              </svg>
              Sign in with Microsoft
            </Button>
          )}

          {/* Dev Mode Login - Show if Azure AD not configured */}
          <div>
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Demo Mode:</strong> Click the button below to login instantly (no Azure AD required)
              </p>
            </div>
            <Button
              onClick={handleQuickLogin}
              variant="primary"
              size="lg"
              className="w-full mb-4"
            >
              🚀 Quick Login (Demo)
            </Button>
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-2">Or use custom email:</p>
              <form onSubmit={handleDevSignIn} className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="your@email.com"
                />
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                >
                  Sign In
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

