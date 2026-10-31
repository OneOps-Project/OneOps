"use client";
import { useState } from "react";
import { Button } from "@/features/work-management/work/tasks/components/primitives/button";
import { ReasonDialog } from "@/features/work-management/work/tasks/components/reason-dialog";
import {
  reasonRequiredCodes,
  transitionHint,
  transitionLabel,
} from "@/features/work-management/work/tasks/constants";

export type TransitionRequest = {
  code: string;
  to: string;
  reason?: string;
  overrideReason?: string;
};

const destructive = new Set(["TR-08"]);

export function TaskActions({
  allowed,
  pending,
  allowOverride,
  onTransition,
}: {
  /** `blockedBy` is the count of open tasks that still hold the move back. */
  allowed: readonly { code: string; to: string; blockedBy: number }[];
  pending: boolean;
  /** Set when the API reported blocking acceptance criteria. */
  allowOverride?: boolean;
  /** Rejects when the API refuses the move, so the prompt can explain it. */
  onTransition: (input: TransitionRequest) => Promise<void>;
}) {
  const [move, setMove] = useState<{
    code: string;
    to: string;
    blockedBy?: number;
  } | null>(null);
  const [overriding, setOverriding] = useState(false);
  const anyBlocked = allowed.some((item) => item.blockedBy > 0);
  const close = () => {
    setMove(null);
    setOverriding(false);
  };

  return (
    <div role="group" aria-label="Chuyển trạng thái">
      {allowed.length ? (
        <div className="flex flex-wrap gap-2">
          {allowed.map((item) => {
            const blocked = item.blockedBy > 0;
            return (
              <Button
                key={item.code}
                variant={
                  destructive.has(item.code) ? "destructive" : "secondary"
                }
                disabled={pending}
                title={
                  blocked
                    ? `Còn ${item.blockedBy} công việc chặn chưa xong; Quản lý có thể ghi đè kèm lý do.`
                    : transitionHint[item.code]
                }
                onClick={() => {
                  if (reasonRequiredCodes.includes(item.code)) {
                    setOverriding(false);
                    setMove(item);
                    return;
                  }
                  // A gated start asks for the override reason instead of failing.
                  if (blocked) {
                    setOverriding(true);
                    setMove(item);
                    return;
                  }
                  void onTransition(item).catch(() => {
                    /* the detail panel shows the reason */
                  });
                }}
              >
                {transitionLabel[item.code] ?? `Chuyển sang ${item.to}`}
                {blocked && ` (${item.blockedBy})`}
              </Button>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Bạn không có thao tác nào khả dụng ở trạng thái hiện tại.
        </p>
      )}
      {anyBlocked && (
        <p className="mt-2 text-sm text-muted-foreground">
          Còn công việc chặn chưa hoàn thành. Bắt đầu sớm cần Quản lý ghi đè kèm
          lý do.
        </p>
      )}
      {allowOverride && (
        <div className="mt-2">
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() => {
              setOverriding(true);
              setMove({ code: "TR-04", to: "Hoàn thành" });
            }}
          >
            Bỏ qua kiểm tra và hoàn thành
          </Button>
        </div>
      )}
      {move && overriding && (move.blockedBy ?? 0) > 0 && (
        <ReasonDialog
          title="Bắt đầu khi còn việc chặn"
          description="Chỉ Quản lý được ghi đè. Lý do được lưu vào lịch sử công việc."
          label="Lý do ghi đè"
          confirmLabel={transitionLabel[move.code] ?? "Bắt đầu"}
          pending={pending}
          onCancel={close}
          onConfirm={async (reason) => {
            await onTransition({ ...move, overrideReason: reason });
            close();
          }}
        />
      )}
      {move && overriding && !(move.blockedBy ?? 0) && (
        <ReasonDialog
          title="Bỏ qua tiêu chí kiểm tra"
          description="Chỉ Quản lý được bỏ qua. Lý do được ghi vào lịch sử công việc."
          label="Lý do bỏ qua"
          confirmLabel="Hoàn thành"
          pending={pending}
          onCancel={close}
          onConfirm={async (reason) => {
            await onTransition({ ...move, overrideReason: reason });
            close();
          }}
        />
      )}
      {move && !overriding && (
        <ReasonDialog
          title={transitionLabel[move.code] ?? "Chuyển trạng thái"}
          description={`Công việc sẽ chuyển sang “${move.to}”. Lý do được lưu vào lịch sử.`}
          label="Lý do"
          confirmLabel="Xác nhận"
          destructive={destructive.has(move.code)}
          pending={pending}
          onCancel={close}
          onConfirm={async (reason) => {
            await onTransition({ ...move, reason });
            close();
          }}
        />
      )}
    </div>
  );
}
