import React from "react";

type TaskCardProps = {
  title: string;
  status: "draft" | "planned" | "approved" | "executing" | "confirmed" | "done" | "failed";
  permissions: string[];
  progress: number;
  error?: string;
};

export function TaskCard(props: TaskCardProps): JSX.Element {
  return (
    <div style={{ border: "1px solid #ddd", padding: 12, borderRadius: 8 }}>
      <div style={{ fontWeight: 600 }}>{props.title}</div>
      <div>Status: {props.status}</div>
      <div>Progress: {Math.round(props.progress * 100)}%</div>
      <div>Permissions: {props.permissions.join(", ") || "none"}</div>
      {props.error ? <div style={{ color: "#b00020" }}>{props.error}</div> : null}
    </div>
  );
}
