"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { post } from "@/lib/api";
import { setToken } from "@/lib/auth";
import { useTranslation } from "@/lib/i18n/useTranslation";

export default function SignupPage() {
  const router = useRouter();
  const { t } = useTranslation();

  const [step, setStep] = useState<"signup" | "verify">("signup");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  function otpNotice(data: { email_sent?: boolean; dev_otp?: string }) {
    if (data.dev_otp) {
      return `Email is not configured yet. Development OTP: ${data.dev_otp}`;
    }
    return data.email_sent === false
      ? "Could not send the email. Check backend email configuration."
      : "Verification code sent. Check your email.";
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);
    try {
      const data = await post<{
        message: string;
        email: string;
        is_verified: boolean;
        email_sent?: boolean;
        dev_otp?: string;
      }>("/auth/signup", {
        name,
        email,
        password,
      });
      setStep("verify");
      setNotice(otpNotice(data));
    } catch (err: any) {
      setError(err.message || t("auth.signupFailed"));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);
    try {
      const data = await post<{ access_token: string }>("/auth/verify-otp", {
        email,
        otp,
      });
      setToken(data.access_token);
      router.push("/trips");
    } catch (err: any) {
      setError(err.message || "Verification failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    setError("");
    setNotice("");
    setLoading(true);
    try {
      const data = await post<{
        message: string;
        email_sent?: boolean;
        dev_otp?: string;
      }>("/auth/resend-otp", { email });
      setNotice(otpNotice(data));
    } catch (err: any) {
      setError(err.message || "Failed to resend OTP.");
    } finally {
      setLoading(false);
    }
  }

  if (step === "verify") {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="text-4xl mb-3">📧</div>
            <h1 className="text-3xl font-bold text-gray-900">Check your email</h1>
            <p className="text-gray-500 mt-2">We sent a 6-digit code to {email}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            {error && (
              <div className="mb-5 px-4 py-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl">
                {error}
              </div>
            )}
            {notice && (
              <div className="mb-5 px-4 py-3 bg-green-50 border border-green-100 text-green-700 text-sm rounded-xl">
                {notice}
              </div>
            )}

            <form onSubmit={handleVerify} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Verification code
                </label>
                <input
                  type="text"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-center tracking-widest text-2xl"
                />
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "Verifying..." : "Verify"}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                Didn't receive the code?{" "}
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading}
                  className="text-indigo-600 font-medium hover:underline disabled:opacity-50"
                >
                  Resend
                </button>
              </p>
            </div>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => {
                  setStep("signup");
                  setOtp("");
                  setError("");
                  setNotice("");
                }}
                className="text-sm text-gray-400 hover:text-gray-600"
              >
                ← Back to signup
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🗺️</div>
          <h1 className="text-3xl font-bold text-gray-900">{t("auth.signupTitle")}</h1>
          <p className="text-gray-500 mt-2">{t("auth.signupSub")}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {error && (
            <div className="mb-5 px-4 py-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl">
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t("auth.fullName")}
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Rahul Sharma"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t("auth.emailAddress")}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t("auth.password")}
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? t("auth.creatingAccount") : t("auth.createAccount")}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            {t("auth.alreadyHaveAccount")}{" "}
            <Link href="/login" className="text-indigo-600 font-medium hover:underline">
              {t("auth.signIn2")}
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          {t("auth.termsNote")}
        </p>
      </div>
    </div>
  );
}
