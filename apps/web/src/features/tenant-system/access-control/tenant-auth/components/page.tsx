"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ListChecks,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { useSession } from "@/features/tenant-system/access-control/tenant-auth/hooks/session";
import { roleLabels } from "@/features/tenant-system/access-control/tenant-auth/constants";
import { Input } from "@/features/tenant-system/access-control/tenant-auth/components/primitives/forms";
import { Field } from "@/features/tenant-system/access-control/tenant-auth/components/primitives/field";
import { Button } from "@/features/tenant-system/access-control/tenant-auth/components/primitives/button";
import {
  firstAdminSchema,
  credentialSchema,
  passwordChangeSchema,
} from "@/features/tenant-system/access-control/tenant-auth/types";
import styles from "@/features/tenant-system/access-control/tenant-auth/components/styles.module.css";

const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : "Không thể kết nối máy chủ.";

export function ModulePage() {
  const router = useRouter();
  const {
    status,
    actor,
    needsSetup,
    idleMinutes,
    signIn,
    createFirstAdmin,
    changePassword,
    signOut,
  } = useSession();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const step = actor?.mustChangePassword
    ? "password"
    : needsSetup && !actor
      ? "setup"
      : "login";
  const enter = () => router.replace("/");
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      if (step === "password") {
        if (newPassword !== confirmPassword) {
          setError("Mật khẩu nhập lại không khớp.");
          return;
        }
        const parsed = passwordChangeSchema.safeParse({
          currentPassword,
          newPassword,
        });
        if (!parsed.success) {
          setError(parsed.error.issues[0]?.message ?? "Dữ liệu chưa hợp lệ.");
          return;
        }
        setPending(true);
        await changePassword(parsed.data);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        enter();
        return;
      }
      const credential = credentialSchema.safeParse({ username, password });
      if (!credential.success) {
        setError(credential.error.issues[0]?.message ?? "Dữ liệu chưa hợp lệ.");
        return;
      }
      setPending(true);
      if (step === "setup") {
        const parsed = firstAdminSchema.safeParse({
          displayName,
          username,
          password,
        });
        if (!parsed.success) {
          setError(parsed.error.issues[0]?.message ?? "Dữ liệu chưa hợp lệ.");
          return;
        }
        await createFirstAdmin(parsed.data);
      } else {
        const signed = await signIn(
          credential.data.username,
          credential.data.password,
        );
        if (!signed.mustChangePassword) enter();
      }
      setPassword("");
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setPending(false);
    }
  };
  return (
    <div className={styles.screen}>
      <aside className={styles.brand} aria-label="Giới thiệu OneOps">
        <div>
          <p className={styles.brandMark}>
            <span className={styles.brandBadge}>
              <ShieldCheck className="size-4" aria-hidden="true" />
            </span>
            OneOps
          </p>
          <h2 className={styles.brandHeadline}>
            Một không gian cho công việc, nhân sự và vận hành.
          </h2>
          <p className={styles.brandLede}>
            Mỗi phân hệ giữ đúng phần việc của mình: công việc và quy trình ở
            Công việc, hồ sơ và chấm công ở Nhân sự, tài khoản và nhật ký ở Hệ
            thống.
          </p>
          <ul className={styles.brandList}>
            <li>
              <ListChecks className="size-4" aria-hidden="true" />
              Một hàng đợi công việc, lọc theo người làm và hạn chót.
            </li>
            <li>
              <Users className="size-4" aria-hidden="true" />
              Chấm công, nghỉ phép và duyệt đề xuất trong cùng một chỗ.
            </li>
            <li>
              <Sparkles className="size-4" aria-hidden="true" />
              Quy tắc tự động nhắc việc thay vì phải nhớ từng mốc.
            </li>
          </ul>
        </div>
        <p className={styles.brandFoot}>
          <LockKeyhole className="size-3.5" aria-hidden="true" />
          Dữ liệu nội bộ · mọi thao tác đều được ghi nhật ký.
        </p>
      </aside>

      <main className={styles.panel}>
        <div className={styles.card}>
          <div className={styles.cardMark}>
            <span className={styles.markIcon}>
              <ShieldCheck className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className={styles.markName}>OneOps</p>
              <p className={styles.markTag}>Không gian làm việc</p>
            </div>
          </div>
          {step === "login" && actor ? (
            <>
              <h1 className={styles.title}>Đang đăng nhập</h1>
              <p className={styles.lede}>
                {actor.displayName} · {roleLabels[actor.role]}
                {actor.isSystemAdmin ? " · Quản trị hệ thống" : ""}
              </p>
              <div className={styles.actions}>
                <Button size="lg" onClick={enter}>
                  Vào không gian làm việc
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={async () => {
                    await signOut();
                  }}
                >
                  Đăng xuất
                </Button>
              </div>
            </>
          ) : (
            <>
              <h1 className={styles.title}>
                {step === "setup"
                  ? "Tạo quản trị đầu tiên"
                  : step === "password"
                    ? "Đổi mật khẩu lần đầu"
                    : "Đăng nhập OneOps"}
              </h1>
              <p className={styles.lede}>
                {step === "setup"
                  ? "Hệ thống chưa có tài khoản. Tài khoản đầu tiên phải là Quản lý kèm quyền quản trị hệ thống."
                  : step === "password"
                    ? `Tài khoản ${actor?.username ?? ""} cần đổi mật khẩu trước khi tiếp tục.`
                    : status === "loading"
                      ? "Đang kiểm tra phiên đăng nhập…"
                      : `Phiên làm việc tự khóa sau ${idleMinutes} phút không hoạt động.`}
              </p>
              <form className={styles.form} onSubmit={submit} noValidate>
                {step === "setup" && (
                  <Field label="Tên hiển thị">
                    <Input
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                      autoComplete="name"
                      required
                    />
                  </Field>
                )}
                {step !== "password" && (
                  <>
                    <Field label="Tên đăng nhập">
                      <Input
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        autoComplete="username"
                        autoFocus
                        required
                      />
                    </Field>
                    <Field
                      label="Mật khẩu"
                      hint={step === "setup" ? "Tối thiểu 8 ký tự." : undefined}
                    >
                      <Input
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        autoComplete={
                          step === "setup" ? "new-password" : "current-password"
                        }
                        required
                      />
                    </Field>
                  </>
                )}
                {step === "password" && (
                  <>
                    <Field label="Mật khẩu hiện tại">
                      <Input
                        type="password"
                        value={currentPassword}
                        onChange={(event) =>
                          setCurrentPassword(event.target.value)
                        }
                        autoComplete="current-password"
                        autoFocus
                        required
                      />
                    </Field>
                    <Field
                      label="Mật khẩu mới"
                      hint="Tối thiểu 8 ký tự, khác mật khẩu hiện tại."
                    >
                      <Input
                        type="password"
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        autoComplete="new-password"
                        required
                      />
                    </Field>
                    <Field label="Nhập lại mật khẩu mới">
                      <Input
                        type="password"
                        value={confirmPassword}
                        onChange={(event) =>
                          setConfirmPassword(event.target.value)
                        }
                        autoComplete="new-password"
                        required
                      />
                    </Field>
                  </>
                )}
                {error && (
                  <p className="text-sm text-destructive" role="alert">
                    {error}
                  </p>
                )}
                <Button type="submit" loading={pending} size="lg">
                  {step === "setup"
                    ? "Tạo tài khoản quản trị"
                    : step === "password"
                      ? "Lưu mật khẩu mới"
                      : "Đăng nhập"}
                </Button>
              </form>
            </>
          )}
        </div>
        <p className={styles.note}>
          Chức danh không cấp quyền; quyền chỉ đến từ vai trò và cờ quản trị hệ
          thống.
        </p>
      </main>
    </div>
  );
}
