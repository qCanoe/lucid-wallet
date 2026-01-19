import React from "react";

type TaskCardProps = {
  title: string;
  status: "draft" | "planned" | "approved" | "executing" | "confirmed" | "done" | "failed";
  permissions: string[];
  progress: number;
  error?: string;
};

export function TaskCard(props: TaskCardProps): JSX.Element {
  const statusMap: Record<
    TaskCardProps["status"],
    { label: string; color: string; background: string }
  > = {
    draft: { label: "草稿", color: "#1F2937", background: "rgba(148, 163, 184, 0.25)" },
    planned: { label: "已规划", color: "#1E1B4B", background: "rgba(129, 140, 248, 0.25)" },
    approved: { label: "已授权", color: "#0F172A", background: "rgba(34, 197, 94, 0.2)" },
    executing: { label: "执行中", color: "#9A3412", background: "rgba(249, 115, 22, 0.2)" },
    confirmed: { label: "已确认", color: "#0F172A", background: "rgba(59, 130, 246, 0.2)" },
    done: { label: "已完成", color: "#052E16", background: "rgba(16, 185, 129, 0.2)" },
    failed: { label: "失败", color: "#7F1D1D", background: "rgba(239, 68, 68, 0.2)" },
  };
  const status = statusMap[props.status];
  const percent = Math.max(0, Math.min(100, Math.round(props.progress * 100)));

  return (
    <div className="task-card">
      <div className="task-header">
        <div className="task-title">{props.title}</div>
        <span
          className="status-pill"
          style={{ color: status.color, background: status.background }}
        >
          {status.label}
        </span>
      </div>
      <div className="task-meta">
        进度 {percent}% · 权限 {props.permissions.join("、") || "无"}
      </div>
      <div className="progress-track" aria-hidden="true">
        <div className="progress-fill" style={{ width: `${percent}%` }} />
      </div>
      {props.error ? <div className="task-error">{props.error}</div> : null}
    </div>
  );
}
