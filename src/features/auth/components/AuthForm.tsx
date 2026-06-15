// src/features/auth/components/AuthForm.tsx
"use client";

import { useState, useTransition } from "react";
import { login, signup } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const action = isLogin ? login : signup;
      const result = await action(formData);
      
      if (result?.error) {
        setError(result.error);
      }
    });
  };

  return (
    <Card className="w-full max-w-md shadow-lg border-neutral-200">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-semibold tracking-tight">
          {isLogin ? "Sign in to MDS" : "Create an account"}
        </CardTitle>
        <CardDescription className="text-neutral-500">
          {isLogin 
            ? "Enter your email and password to access your ledger." 
            : "Enter your details to provision a new business tenant."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input id="full_name" name="full_name" placeholder="Juan Dela Cruz" required={!isLogin} disabled={isPending} />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="m.doe@example.com" required disabled={isPending} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required disabled={isPending} />
          </div>

          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Authenticating..." : (isLogin ? "Sign In" : "Sign Up")}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col space-y-4 border-t pt-4">
        <div className="text-sm text-center text-neutral-500">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
            }}
            className="text-neutral-900 font-medium hover:underline disabled:opacity-50"
            disabled={isPending}
          >
            {isLogin ? "Sign up" : "Sign in"}
          </button>
        </div>
      </CardFooter>
    </Card>
  );
}