"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { verifyOtpAction, resendOtpAction } from "@/lib/actions";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get("email") || "";

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!email) {
      router.push("/register");
    }
  }, [email, router]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return;

    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    // Move to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const data = e.clipboardData.getData("text").trim();
    if (!/^\d{6}$/.test(data)) return;

    const digits = data.split("");
    setOtp(digits);
    inputRefs.current[5]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpString = otp.join("");
    if (otpString.length !== 6) {
      setError("Vui lòng nhập đầy đủ 6 chữ số");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const result = await verifyOtpAction(email, otpString);
      if (result?.error) {
        setError(result.error);
        setLoading(false);
      } else {
        router.push("/profile/edit");
      }
    } catch (err) {
      setError("Có lỗi xảy ra khi xác thực");
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;

    setResending(true);
    setError("");
    try {
      const result = await resendOtpAction(email);
      if (result?.error) {
        setError(result.error);
      } else {
        setTimer(60);
        setCanResend(false);
      }
    } catch (err) {
      setError("Không thể gửi lại mã");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background font-body text-on-surface antialiased flex flex-col">
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl shadow-sm border-b border-outline/5">
        <div className="max-w-7xl mx-auto flex justify-between items-center px-8 py-4">
          <Link href="/" className="text-2xl font-black text-primary tracking-tighter uppercase">HanoiGO</Link>
        </div>
      </nav>

      <main className="flex-grow pt-32 flex items-center justify-center p-8">
        <div className="max-w-md w-full">
          <header className="mb-12 text-center">
            <div className="w-20 h-20 bg-primary/10 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
              <span className="material-symbols-outlined text-primary text-4xl">mark_email_read</span>
            </div>
            <span className="text-primary font-black tracking-[0.4em] uppercase text-[10px] mb-4 block">Security Check</span>
            <h1 className="text-4xl font-black text-on-surface tracking-tighter mb-4 leading-tight">Verify your email.</h1>
            <p className="text-outline font-medium text-sm leading-relaxed px-8">
              Chúng tôi đã gửi mã xác thực 6 số đến <br />
              <strong className="text-on-surface">{email}</strong>
            </p>
          </header>

          {error && (
            <div className="mb-8 p-6 bg-primary/5 text-primary rounded-[2rem] text-[11px] font-black uppercase tracking-widest border border-primary/10 text-center animate-in shake duration-500">
              {error}
            </div>
          )}

          <form className="space-y-12" onSubmit={handleSubmit}>
            <div className="flex justify-between gap-3">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  className="w-12 h-16 md:w-14 md:h-20 bg-surface-container-low text-center text-2xl font-black rounded-2xl border border-outline/10 focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all"
                  required
                />
              ))}
            </div>

            <div className="space-y-6">
              <button
                className="w-full bg-primary text-white py-6 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.3em] shadow-2xl shadow-primary/20 hover:opacity-95 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                type="submit"
                disabled={loading || otp.some((d) => !d)}
              >
                {loading ? "Verifying..." : "Verify Identity"}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={!canResend || resending}
                  className={`text-[10px] font-black uppercase tracking-widest transition-all ${
                    canResend ? "text-primary hover:underline" : "text-outline/40 cursor-not-allowed"
                  }`}
                >
                  {resending ? "Sending..." : canResend ? "Resend Verification Code" : `Resend in ${timer}s`}
                </button>
              </div>
            </div>
          </form>

          <footer className="mt-16 text-center">
            <Link href="/register" className="text-[10px] font-black text-outline hover:text-primary uppercase tracking-widest transition-colors">
              Wrong email? Back to register
            </Link>
          </footer>
        </div>
      </main>
    </div>
  );
}
