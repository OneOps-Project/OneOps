"use client";

import { useEffect, useRef, useState } from "react";
import { Compass } from "lucide-react";
import { Button } from "@/core/ui/primitives/button";

/**
 * Hướng dẫn ngắn 4 bước cho người dùng mới. Không tự bật để không chắn thao tác:
 * mở từ nút trên thanh trên, từ bảng tài khoản hoặc sự kiện `oneops:tour`.
 */
const STEPS = [
  {
    target: "rail",
    title: "Điều hướng theo phân hệ",
    body: "Rail bên trái gom bốn phân hệ: Công việc, Nhân sự, Hệ thống và Thư viện UI. Mục đang mở có vạch cam và nền sáng để bạn luôn biết mình đang ở đâu.",
  },
  {
    target: "search",
    title: "Tìm mọi chức năng bằng Ctrl K",
    body: "Gõ tên màn hình, dùng ↑ ↓ để chọn và Enter để mở. Esc đóng ngay mọi lớp phủ.",
  },
  {
    target: "create",
    title: "Tạo mới mà không rời trang",
    body: "Nút dấu cộng mở form tạo nhanh và cho phép đổi phân hệ ngay trong hộp thoại.",
  },
  {
    target: "content",
    title: "Vùng dữ liệu là trung tâm",
    body: "Mỗi trang có một hành động chính, bộ lọc rõ ràng và đủ trạng thái đang tải, trống, lỗi. Số liệu luôn đi kèm đơn vị và ngày theo dd/MM/yyyy.",
  },
] as const;

const STORAGE_KEY = "oneops.onboarding.v1";
const CARD_WIDTH = 420;

function remember() {
  try {
    localStorage.setItem(STORAGE_KEY, "seen");
  } catch {
    /* chế độ riêng tư: bỏ qua ghi nhớ */
  }
}

export function Onboarding({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [step, setStep] = useState(0);
  const spotRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const total = STEPS.length;
  const current = STEPS[step];

  useEffect(() => {
    if (!open) return;
    function place() {
      const card = cardRef.current;
      const spot = spotRef.current;
      if (!card) return;
      const target = document.querySelector<HTMLElement>(
        `[data-tour="${current.target}"]`,
      );
      if (!target) {
        card.style.width = `${Math.min(CARD_WIDTH, window.innerWidth - 24)}px`;
        card.style.left = "12px";
        card.style.top = "50%";
        card.style.transform = "translateY(-50%)";
        if (spot) spot.style.opacity = "0";
        return;
      }
      const box = target.getBoundingClientRect();
      const pad = 6;
      if (spot) {
        spot.style.opacity = "1";
        spot.style.top = `${Math.max(box.top - pad, 8)}px`;
        spot.style.left = `${Math.max(box.left - pad, 8)}px`;
        spot.style.width = `${Math.min(box.width + pad * 2, window.innerWidth - 16)}px`;
        spot.style.height = `${Math.min(box.height + pad * 2, window.innerHeight - 16)}px`;
      }
      const width = Math.min(CARD_WIDTH, window.innerWidth - 24);
      const height = card.offsetHeight || 236;
      // Mục tiêu cao hơn thẻ (rail, panel): neo gần đầu và né vòng sáng của spotlight.
      const tall = box.height > height + 48;
      const gap = tall ? 26 : 16;
      let left = box.right + gap;
      if (left + width > window.innerWidth - 12)
        left = Math.max(12, box.left - width - gap);
      if (left + width > window.innerWidth - 12)
        left = Math.max(12, window.innerWidth - width - 12);
      let top = tall ? box.top + 24 : box.top;
      top = Math.max(12, top);
      if (top + height > window.innerHeight - 12)
        top = Math.max(12, window.innerHeight - height - 12);
      card.style.width = `${width}px`;
      card.style.left = `${left}px`;
      card.style.top = `${top}px`;
      card.style.transform = "none";
    }
    place();
    cardRef.current?.focus();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, current]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        remember();
        onClose();
      }
      if (event.key === "ArrowRight")
        setStep((value) => Math.min(value + 1, total - 1));
      if (event.key === "ArrowLeft") setStep((value) => Math.max(value - 1, 0));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, total]);

  if (!open) return null;
  const last = step === total - 1;

  return (
    <div className="tour-layer">
      <div ref={spotRef} className="tour-spot" aria-hidden="true" />
      <div
        ref={cardRef}
        className="tour-card"
        role="dialog"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        tabIndex={-1}
      >
        <div className="tour-head">
          <span className="tour-count">
            Bước {step + 1}/{total}
          </span>
          <span className="tour-dots" aria-hidden="true">
            {STEPS.map((item, index) => (
              <span
                key={item.target}
                className="tour-dot"
                data-active={index === step}
              />
            ))}
          </span>
        </div>
        <h2 id="tour-title">{current.title}</h2>
        <p id="tour-body">{current.body}</p>
        <div className="tour-actions">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              remember();
              onClose();
            }}
          >
            Bỏ qua
          </Button>
          <div>
            {step > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setStep((value) => value - 1)}
              >
                Quay lại
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => {
                if (last) {
                  remember();
                  onClose();
                } else setStep((value) => value + 1);
              }}
            >
              {last ? "Hoàn tất" : "Tiếp tục"}
            </Button>
          </div>
        </div>
        <p className="sr-only" aria-live="polite">
          {`Bước ${step + 1} trên ${total}: ${current.title}`}
        </p>
      </div>
    </div>
  );
}

/** Nút mở hướng dẫn, dùng chung cho thanh trên và bảng tài khoản. */
export function OnboardingTrigger({ compact = false }: { compact?: boolean }) {
  return (
    <button
      type="button"
      className={
        compact ? "icon-button" : "flex items-center gap-2 text-sm text-primary"
      }
      aria-label="Xem hướng dẫn sử dụng"
      onClick={() => window.dispatchEvent(new Event("oneops:tour"))}
    >
      <Compass aria-hidden="true" size={16} />
      {!compact && "Hướng dẫn nhanh"}
    </button>
  );
}
