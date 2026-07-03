// src/features/auth/components/AuthForm.tsx
"use client";

import { useState, useTransition } from "react";
import { login, signup, requestPasswordReset } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type AuthView = "login" | "signup" | "forgot";

export function AuthForm() {
  const [view, setView] = useState<AuthView>("login");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // --- IDENTITY STATES ---
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");

  // --- MOBILE NUMBER STATES ---
  const [countryCode, setCountryCode] = useState("+63");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneError, setPhoneError] = useState("");

  // --- PASSWORD & SECURITY STATES ---
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // --- COMPLIANCE STATES ---
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (emailError) setEmailError("");
    if (successMsg) setSuccessMsg(null);
  };

  const handleCountryChange = (val: string) => {
    setCountryCode(val);
    if (val !== "+63") setPhoneError("Only Philippine Mobile Networks are supported at this time.");
    else setPhoneError(""); 
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, ''); 
    if (countryCode === "+63" && val.startsWith("0")) val = val.substring(1);
    if (countryCode === "+63" && val.length > 10) val = val.slice(0, 10);
    setPhoneNumber(val);
    if (phoneError) setPhoneError(""); 
  };

  const switchView = (newView: AuthView) => {
    setView(newView);
    setError(null);
    setSuccessMsg(null);
    setPhoneError("");
    setEmailError("");
    setPassword("");
    setConfirmPassword("");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setPhoneError("");
    setEmailError("");
    
    // Strict Regex applies to all views
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      setEmailError("Please enter a valid email address (e.g., name@company.com).");
      return;
    }

    const formData = new FormData(e.currentTarget);
    formData.set("email", email);

    // --- RECOVERY FLOW ---
    if (view === "forgot") {
      startTransition(async () => {
        const result = await requestPasswordReset(formData);
        if (result?.error) {
          setError(result.error);
        } else {
          setSuccessMsg("If an account exists, a password reset link has been sent to your email.");
        }
      });
      return;
    }

    // --- SIGNUP VALIDATION GUARD ---
    if (view === "signup") {
      if (countryCode !== "+63") {
        setPhoneError("Only Philippine Mobile Networks are supported at this time.");
        return;
      }
      if (phoneNumber.length !== 10 || !phoneNumber.startsWith("9")) {
        setPhoneError("Please enter a valid 10-digit Philippine mobile number (e.g., 9123456789).");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match. Please verify your password.");
        return;
      }
      if (!agreedToTerms) {
        setError("You must agree to the User Safety & Data Privacy Statement to create an account.");
        return;
      }
      formData.set("mobile_number", `${countryCode}${phoneNumber}`);
      formData.set("terms_accepted", agreedToTerms ? "true" : "false");
    }

    // --- LOGIN / SIGNUP EXECUTION ---
    startTransition(async () => {
      const action = view === "login" ? login : signup;
      const result = await action(formData);
      if (result?.error) setError(result.error);
    });
  };

  const EyeIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>);
  const EyeOffIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>);

  return (
    <>
      <Card className="w-full max-w-md shadow-lg border-neutral-200">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-semibold tracking-tight">
            {view === "login" && "Sign in to MacroBiz"}
            {view === "signup" && "Create an account"}
            {view === "forgot" && "Reset your password"}
          </CardTitle>
          <CardDescription className="text-neutral-500">
            {view === "login" && "Enter your email and password to access your MacroBiz ledger."}
            {view === "signup" && "Enter your details to provision a new business tenant."}
            {view === "forgot" && "Enter your email and we will send you a secure verification link."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {view === "signup" && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input id="full_name" name="full_name" placeholder="Juan Dela Cruz" required disabled={isPending} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone_number" className={phoneError ? "text-red-600" : ""}>Mobile Number</Label>
                  <div className="flex gap-2">
                    <Select value={countryCode} onValueChange={handleCountryChange} disabled={isPending}>
                      <SelectTrigger className={`w-[120px] ${phoneError ? "border-red-500" : ""}`}>
                        <SelectValue placeholder="Code" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="+63">🇵🇭 +63</SelectItem>
                        <SelectItem value="+1">🇺🇸 +1</SelectItem>
                        <SelectItem value="+44">🇬🇧 +44</SelectItem>
                        <SelectItem value="+61">🇦🇺 +61</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Input 
                      id="phone_number" 
                      type="tel" 
                      placeholder="912 345 6789" 
                      value={phoneNumber}
                      onChange={handlePhoneChange}
                      disabled={isPending || countryCode !== "+63"}
                      className={`flex-1 ${phoneError ? "border-red-500 focus-visible:ring-red-500 bg-red-50/50" : ""}`}
                      required={view === "signup"} 
                    />
                  </div>
                  {phoneError && <p className="text-[11px] font-semibold text-red-600 mt-1">{phoneError}</p>}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className={emailError ? "text-red-600" : ""}>Email</Label>
              <Input 
                id="email" 
                name="email" 
                type="email" 
                placeholder="m.doe@example.com" 
                value={email}
                onChange={handleEmailChange}
                disabled={isPending}
                className={emailError ? "border-red-500 focus-visible:ring-red-500 bg-red-50/50" : ""}
                required 
              />
              {emailError && <p className="text-[11px] font-semibold text-red-600 mt-1">{emailError}</p>}
            </div>
            
            {/* THE FIX: Replaced negative check (view !== "forgot") with affirmative check */}
            {(view === "login" || view === "signup") && (
              <div className="space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {view === "login" && (
                    <button type="button" onClick={() => switchView("forgot")} className="text-xs font-medium text-neutral-500 hover:text-neutral-900 hover:underline" disabled={isPending}>
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Input 
                    id="password" 
                    name="password" 
                    type={showPassword ? "text" : "password"} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                    required={view === "login" || view === "signup"} 
                    disabled={isPending} 
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 focus:outline-none" tabIndex={-1}>
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>
            )}

            {view === "signup" && (
              <div className="space-y-2 animate-in fade-in">
                <Label htmlFor="confirm_password">Confirm Password</Label>
                <div className="relative">
                  <Input 
                    id="confirm_password" 
                    type={showConfirmPassword ? "text" : "password"} 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pr-10"
                    required={view === "signup"} 
                    disabled={isPending} 
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 focus:outline-none" tabIndex={-1}>
                    {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>
            )}

            {view === "signup" && (
              <div className="flex items-start gap-3 mt-4 mb-2 p-3 bg-neutral-50 rounded-md border border-neutral-200 animate-in fade-in">
                <div className="flex items-center h-5">
                  <input 
                    id="terms" 
                    type="checkbox" 
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="w-4 h-4 text-neutral-900 bg-white border-neutral-300 rounded focus:ring-neutral-900 focus:ring-2"
                    required
                  />
                </div>
                <Label htmlFor="terms" className="text-xs text-neutral-600 font-normal leading-relaxed">
                  I agree to the <button type="button" onClick={() => setShowTermsModal(true)} className="font-bold text-neutral-900 hover:underline">User Safety & Data Privacy Statement</button>. I understand that my information will be securely managed by MacroBiz.
                </Label>
              </div>
            )}

            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-md animate-in fade-in">
                {error}
              </div>
            )}
            
            {successMsg && (
              <div className="p-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md animate-in fade-in">
                {successMsg}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isPending || !!phoneError || !!emailError || (view === "signup" && !agreedToTerms)}>
              {isPending ? "Processing..." : view === "login" ? "Sign In" : view === "signup" ? "Sign Up" : "Send Reset Link"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4 border-t pt-4">
          <div className="text-sm text-center text-neutral-500">
            {view === "login" && (
              <>Don't have an account? <button type="button" onClick={() => switchView("signup")} className="text-neutral-900 font-medium hover:underline disabled:opacity-50" disabled={isPending}>Sign up</button></>
            )}
            {view === "signup" && (
              <>Already have an account? <button type="button" onClick={() => switchView("login")} className="text-neutral-900 font-medium hover:underline disabled:opacity-50" disabled={isPending}>Sign in</button></>
            )}
            {view === "forgot" && (
              <>Remember your password? <button type="button" onClick={() => switchView("login")} className="text-neutral-900 font-medium hover:underline disabled:opacity-50" disabled={isPending}>Back to sign in</button></>
            )}
          </div>
        </CardFooter>
      </Card>

      {/* PRIVACY STATEMENT MODAL */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="flex items-center justify-between p-6 border-b border-neutral-100 bg-neutral-50">
              <h2 className="text-xl font-bold text-neutral-900">User Safety & Data Privacy Statement</h2>
              <button onClick={() => setShowTermsModal(false)} className="text-neutral-400 hover:text-neutral-800 transition-colors p-2">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 text-sm text-neutral-700 space-y-6 leading-relaxed">
              <p>At <strong>MacroBiz</strong>, your privacy, security, and trust are our highest priorities. We understand that your personal information and business data are among your most valuable assets. That's why we are committed to protecting every piece of information you entrust to our platform.</p>
              <div>
                <h3 className="font-bold text-neutral-900 text-base mb-3">Our Commitment to You</h3>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Your personal and business information is treated as strictly confidential.</li>
                  <li>We do not sell, rent, or share your data with third parties for advertising or marketing purposes.</li>
                  <li>Your information is collected and used only to provide, maintain, secure, and improve the services you choose to use.</li>
                  <li>We employ industry-standard security practices and technologies designed to help protect your data from unauthorized access, misuse, alteration, disclosure, or destruction.</li>
                  <li>Access to your information is restricted to authorized personnel only when necessary to provide technical support or maintain our services.</li>
                  <li>We continuously enhance our security measures to help ensure the confidentiality, integrity, and availability of your data.</li>
                </ul>
              </div>
              <p>At MacroBiz, we believe every entrepreneur, professional, and organization deserves a secure and reliable platform to manage their business with confidence. We are committed to safeguarding your information and handling your data with transparency, responsibility, and respect.</p>
              <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                <p className="font-bold text-center text-neutral-900">Your business. Your data. Your privacy. Protected by MacroBiz.</p>
                <p className="text-xs text-center text-neutral-500 mt-2">MacroBiz is proudly developed and maintained by Macrotek Digital Solutions, committed to building secure, reliable, and innovative digital solutions that empower Filipino businesses.</p>
              </div>
            </div>
            <div className="p-6 border-t border-neutral-100 bg-white flex justify-end">
              <Button onClick={() => setShowTermsModal(false)} className="bg-neutral-900 text-white hover:bg-neutral-800">
                Close Document
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}