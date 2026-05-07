"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { clientRoutes } from "@/config/routes";
import { branding } from "@/config/branding";
import { useLoginMutation } from "@/hooks/api";
import { ApiError } from "@/lib/api-client";
import {
  AUTH_ACCESS_TOKEN_KEY,
  AUTH_TOKEN_EXPIRY_KEY,
} from "@/lib/auth-storage";
import { toast } from "sonner";

export function LoginView() {
  const router = useRouter();
  const [loginVal, setLoginVal] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    login?: string;
    password?: string;
  }>({});

  const loginMutation = useLoginMutation();

  const validate = () => {
    const next: typeof fieldErrors = {};
    if (!loginVal.trim()) next.login = "Nhập email hoặc tên đăng nhập.";
    if (!password) next.password = "Nhập mật khẩu.";
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    loginMutation.mutate(
      { login: loginVal.trim(), password },
      {
        onSuccess: (data) => {
          toast.success("Đăng nhập thành công");
          if (typeof window !== "undefined") {
            localStorage.setItem(AUTH_ACCESS_TOKEN_KEY, data.accessToken);
            localStorage.setItem(AUTH_TOKEN_EXPIRY_KEY, data.expiresAtUtc);
          }
          setLoginVal("");
          setPassword("");
          setFieldErrors({});
          router.replace(clientRoutes.home);
        },
        onError: (err) => {
          const message =
            err instanceof ApiError
              ? err.message
              : "Đăng nhập không thành công.";
          toast.error("Đăng nhập thất bại", { description: message });
        },
      },
    );
  };

  return (
    <div className="ds-surface-card-elevated ds-auth-card">
      <div className="ds-auth-view">
        <p className="text-center text-[11px] font-semibold tracking-[0.08em] text-text-secondary-token uppercase">
          {branding.appNameShort}
        </p>
        <p className="ds-auth-greeting mt-4 text-center sm:mt-5">Xin chào,</p>
        <h1 className="ds-auth-title text-center">Đăng nhập</h1>

        <form className="ds-auth-form-login" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="auth-login-id" className="sr-only">
                Email hoặc tên đăng nhập
              </Label>
              <Input
                id="auth-login-id"
                autoComplete="username"
                value={loginVal}
                onChange={(e) => setLoginVal(e.target.value)}
                placeholder="Email hoặc tên đăng nhập"
                className="ds-auth-input"
                aria-invalid={Boolean(fieldErrors.login)}
              />
              {fieldErrors.login ? (
                <p className="ds-field-error" role="alert">
                  {fieldErrors.login}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="auth-login-password" className="sr-only">
                Mật khẩu
              </Label>
              <Input
                id="auth-login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mật khẩu"
                className="ds-auth-input"
                aria-invalid={Boolean(fieldErrors.password)}
              />
              {fieldErrors.password ? (
                <p className="ds-field-error" role="alert">
                  {fieldErrors.password}
                </p>
              ) : null}
            </div>
          </div>

          <div className="ds-auth-tools-row">
            <div className="flex items-center gap-2">
              <Checkbox
                id="auth-remember"
                checked={remember}
                onCheckedChange={(checked) => setRemember(checked === true)}
                className="ds-checkbox-brand"
              />
              <Label htmlFor="auth-remember" className="ds-auth-checkbox-label">
                Ghi nhớ đăng nhập
              </Label>
            </div>
            <Link href="#" className="ds-link-brand shrink-0">
              Quên mật khẩu?
            </Link>
          </div>

          <Button
            type="submit"
            disabled={loginMutation.isPending}
            className="ds-btn-primary-pill"
          >
            {loginMutation.isPending ? "Đang đăng nhập…" : "Đăng nhập"}
          </Button>
        </form>

        <p className="ds-auth-footer mt-5">
          Chưa có tài khoản?{" "}
          <Link href={clientRoutes.register} className="ds-link-heading">
            Đăng ký
          </Link>
        </p>
      </div>
    </div>
  );
}
