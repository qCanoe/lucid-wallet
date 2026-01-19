import React, { useMemo, useState } from "react";
import type { ConsentScope, Plan, StepResult } from "@lucidwallet/core";
import { TaskCard } from "../components/TaskCard";

type ApiError = {
  code: string;
  message: string;
};

type ApiResponse<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: ApiError;
    };

type PlanResponse = {
  plan: Plan;
  scope: ConsentScope;
};

type ExecuteResponse = {
  plan: Plan;
  results: StepResult[];
  scope: ConsentScope;
};

const API_BASE = "";

const postJson = async <T,>(path: string, payload: unknown): Promise<ApiResponse<T>> => {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  let data: ApiResponse<T> | null = null;
  try {
    data = (await res.json()) as ApiResponse<T>;
  } catch {
    data = null;
  }
  if (!data) {
    return { ok: false, error: { code: "unknown_error", message: "invalid_response" } };
  }
  return data;
};

export function HomePage(): JSX.Element {
  const [commandText, setCommandText] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [scope, setScope] = useState<ConsentScope | null>(null);
  const [results, setResults] = useState<StepResult[] | null>(null);
  const [isPlanning, setIsPlanning] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resultMap = useMemo(() => {
    if (!results) {
      return new Map<string, StepResult>();
    }
    return new Map(results.map((result) => [result.step_id, result]));
  }, [results]);

  const handlePlan = async () => {
    if (!commandText.trim()) {
      setError("请输入指令内容");
      return;
    }
    setIsPlanning(true);
    setError(null);
    setResults(null);
    try {
      const response = await postJson<PlanResponse>("/api/plan", { text: commandText });
      if (response.ok) {
        setPlan(response.data.plan);
        setScope(response.data.scope);
      } else {
        setError(response.error.message);
      }
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "网络请求失败");
    } finally {
      setIsPlanning(false);
    }
  };

  const handleExecute = async () => {
    if (!commandText.trim()) {
      setError("请输入指令内容");
      return;
    }
    setIsExecuting(true);
    setError(null);
    try {
      const response = await postJson<ExecuteResponse>("/api/execute", { text: commandText });
      if (response.ok) {
        setPlan(response.data.plan);
        setScope(response.data.scope);
        setResults(response.data.results);
      } else {
        setError(response.error.message);
      }
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "网络请求失败");
    } finally {
      setIsExecuting(false);
    }
  };

  const applySample = (text: string) => {
    setCommandText(text);
    setPlan(null);
    setScope(null);
    setResults(null);
    setError(null);
  };

  const toolLabels: Record<string, string> = {
    chain_read: "读取余额与授权",
    quote_route: "评估路径与滑点",
    build_tx: "生成交易",
    simulate_tx: "模拟交易",
    sign_tx: "签名交易",
    send_tx: "发送交易",
    wait_confirm: "确认上链"
  };

  const renderStepStatus = (stepId: string) => {
    const result = resultMap.get(stepId);
    if (!result) {
      return plan ? "待执行" : "未生成";
    }
    if (result.status === "success") {
      return "成功";
    }
    if (result.status === "failed") {
      return "失败";
    }
    return result.status;
  };

  const isBusy = isPlanning || isExecuting;
  const primaryLabel = plan
    ? isExecuting
      ? "执行中..."
      : "确认执行"
    : isPlanning
      ? "生成中..."
      : "生成计划";
  const secondaryLabel = plan ? "重新生成" : "保存为模板";
  const primaryAction = plan ? handleExecute : handlePlan;
  const secondaryAction = plan ? handlePlan : undefined;

  return (
    <div className="app-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');

        :root {
          color-scheme: light;
        }

        body {
          margin: 0;
          font-family: "Plus Jakarta Sans", system-ui, -apple-system, Segoe UI, sans-serif;
          background: #eef2ff;
          color: #1e1b4b;
        }

        * {
          box-sizing: border-box;
        }

        .app-root {
          min-height: 100vh;
          padding: 32px 24px 48px;
          position: relative;
          overflow: hidden;
        }

        .bg-orb {
          position: absolute;
          inset: auto;
          width: 480px;
          height: 480px;
          border-radius: 50%;
          filter: blur(50px);
          opacity: 0.45;
        }

        .bg-orb.orb-1 {
          top: -120px;
          right: -120px;
          background: radial-gradient(circle at 30% 30%, #c7d2fe, #818cf8);
        }

        .bg-orb.orb-2 {
          bottom: -160px;
          left: -120px;
          background: radial-gradient(circle at 30% 30%, #fecaca, #f97316);
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.75);
          border: 1px solid rgba(148, 163, 184, 0.35);
          backdrop-filter: blur(14px);
          box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 600;
        }

        .brand-mark {
          width: 36px;
          height: 36px;
          border-radius: 12px;
          background: linear-gradient(140deg, #4f46e5, #818cf8);
          display: grid;
          place-items: center;
          color: #fff;
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          border-radius: 999px;
          background: rgba(34, 197, 94, 0.15);
          color: #166534;
          font-size: 13px;
          font-weight: 600;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.2);
        }

        .main-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
          gap: 24px;
          margin-top: 24px;
        }

        .panel {
          padding: 24px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.8);
          border: 1px solid rgba(148, 163, 184, 0.3);
          box-shadow: 0 20px 40px rgba(15, 23, 42, 0.08);
          backdrop-filter: blur(18px);
        }

        .panel h1 {
          font-size: 30px;
          margin: 0 0 8px;
          color: #1e1b4b;
        }

        .panel p {
          margin: 0 0 20px;
          color: #475569;
          line-height: 1.6;
        }

        .command-box {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .command-label {
          font-size: 14px;
          color: #475569;
          font-weight: 600;
        }

        .command-input {
          width: 100%;
          min-height: 120px;
          padding: 14px 16px;
          border-radius: 16px;
          border: 1px solid rgba(148, 163, 184, 0.5);
          background: rgba(255, 255, 255, 0.9);
          color: #0f172a;
          font-size: 14px;
          resize: vertical;
          outline: none;
        }

        .command-input:focus {
          border-color: #4f46e5;
          box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.2);
        }

        .command-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }

        .btn {
          border: none;
          border-radius: 999px;
          padding: 10px 18px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: transform 200ms ease, box-shadow 200ms ease, background 200ms ease;
        }

        .btn-primary {
          background: #4f46e5;
          color: #fff;
          box-shadow: 0 12px 24px rgba(79, 70, 229, 0.25);
        }

        .btn-primary:hover {
          background: #4338ca;
        }

        .btn-secondary {
          background: rgba(79, 70, 229, 0.1);
          color: #312e81;
        }

        .btn-secondary:hover {
          background: rgba(79, 70, 229, 0.18);
        }

        .chips {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .chip {
          padding: 8px 14px;
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, 0.4);
          background: rgba(255, 255, 255, 0.9);
          color: #1f2937;
          font-size: 13px;
          cursor: pointer;
          transition: background 200ms ease, border 200ms ease;
        }

        .chip:hover {
          background: rgba(129, 140, 248, 0.2);
          border-color: rgba(79, 70, 229, 0.4);
        }

        .quick-actions {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 14px;
          margin-top: 18px;
        }

        .quick-card {
          padding: 14px 16px;
          border-radius: 16px;
          border: 1px solid rgba(148, 163, 184, 0.3);
          background: rgba(255, 255, 255, 0.85);
          display: flex;
          flex-direction: column;
          gap: 6px;
          cursor: pointer;
          transition: transform 200ms ease, box-shadow 200ms ease;
        }

        .quick-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 24px rgba(15, 23, 42, 0.08);
        }

        .quick-card svg {
          width: 20px;
          height: 20px;
          color: #4f46e5;
        }

        .panel-title {
          font-size: 16px;
          font-weight: 600;
          margin: 0 0 12px;
        }

        .step-list {
          list-style: none;
          padding: 0;
          margin: 0 0 16px;
          display: grid;
          gap: 10px;
        }

        .step-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          border-radius: 12px;
          background: rgba(248, 250, 252, 0.9);
          border: 1px solid rgba(148, 163, 184, 0.2);
          color: #1f2937;
          font-size: 14px;
        }

        .step-status {
          font-size: 12px;
          color: #475569;
        }

        .panel-sub {
          margin-top: 16px;
          padding: 14px 16px;
          border-radius: 16px;
          border: 1px solid rgba(148, 163, 184, 0.25);
          background: rgba(255, 255, 255, 0.9);
        }

        .permission-list {
          display: grid;
          gap: 8px;
          margin-top: 10px;
          color: #0f172a;
          font-size: 13px;
        }

        .result-card {
          margin-top: 10px;
          padding: 12px;
          border-radius: 12px;
          border: 1px solid rgba(148, 163, 184, 0.25);
          background: rgba(249, 250, 251, 0.9);
          font-size: 13px;
          color: #334155;
        }

        .task-section {
          margin-top: 24px;
        }

        .task-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
          margin-top: 16px;
        }

        .task-card {
          padding: 16px;
          border-radius: 16px;
          border: 1px solid rgba(148, 163, 184, 0.3);
          background: rgba(255, 255, 255, 0.9);
          display: grid;
          gap: 10px;
        }

        .task-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .task-title {
          font-weight: 600;
          color: #0f172a;
        }

        .task-meta {
          font-size: 13px;
          color: #475569;
        }

        .progress-track {
          height: 6px;
          border-radius: 999px;
          background: rgba(148, 163, 184, 0.25);
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, #4f46e5, #818cf8);
        }

        .task-error {
          font-size: 12px;
          color: #b91c1c;
        }

        .footer-note {
          margin-top: 18px;
          font-size: 12px;
          color: #64748b;
        }

        @media (max-width: 960px) {
          .main-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .btn,
          .chip,
          .quick-card {
            transition: none;
          }
        }
      `}</style>

      <div className="bg-orb orb-1" aria-hidden="true" />
      <div className="bg-orb orb-2" aria-hidden="true" />

      <div className="container">
        <header className="topbar">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4 12h16M12 4v16" />
              </svg>
            </span>
            Lucid 指令台
          </div>
          <div className="status-pill">
            <span className="status-dot" aria-hidden="true" />
            已连接主网络
          </div>
        </header>

        <main className="main-grid">
          <section className="panel">
            <h1>用自然语言驱动钱包操作</h1>
            <p>
              输入你想执行的指令，系统会自动解析计划、列出权限、并在确认后执行。
              免去频繁使用 CLI 的步骤。
            </p>

            <div className="command-box">
              <label className="command-label" htmlFor="commandInput">
                指令输入
              </label>
              <textarea
                id="commandInput"
                className="command-input"
                placeholder="例：把 0.2 ETH 换成 USDC，并在滑点 0.5% 内完成"
                value={commandText}
                onChange={(event) => setCommandText(event.target.value)}
              />
              <div className="command-actions">
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={primaryAction}
                  disabled={isBusy}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                  {primaryLabel}
                </button>
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={secondaryAction}
                  disabled={isBusy || !secondaryAction}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M4 4h16v16H4z" />
                    <path d="M8 4v16M16 4v16" />
                  </svg>
                  {secondaryLabel}
                </button>
              </div>
              <div className="chips" aria-label="示例指令">
                <button className="chip" type="button" onClick={() => applySample("查询账户余额")}>
                  查询账户余额
                </button>
                <button className="chip" type="button" onClick={() => applySample("批量签名 3 笔交易")}>
                  批量签名 3 笔交易
                </button>
                <button className="chip" type="button" onClick={() => applySample("转账 0.5 ETH 给 Alice")}>
                  转账 0.5 ETH 给 Alice
                </button>
                <button className="chip" type="button" onClick={() => applySample("查看近 24 小时费用")}>
                  查看近 24 小时费用
                </button>
              </div>
              {error ? <div className="task-error">{error}</div> : null}
            </div>

            <div className="quick-actions">
              <button className="quick-card" type="button">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M4 12h16" />
                  <path d="M12 4v16" />
                </svg>
                <strong>新建计划</strong>
                <span>自动生成执行步骤</span>
              </button>
              <button className="quick-card" type="button">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M4 7h16" />
                  <path d="M4 12h16" />
                  <path d="M4 17h10" />
                </svg>
                <strong>最近模板</strong>
                <span>复用常用流程</span>
              </button>
              <button className="quick-card" type="button">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 3l9 4.5-9 4.5-9-4.5L12 3z" />
                  <path d="M3 12l9 4.5 9-4.5" />
                  <path d="M3 16.5l9 4.5 9-4.5" />
                </svg>
                <strong>批量执行</strong>
                <span>预览权限与费用</span>
              </button>
            </div>
          </section>

          <aside className="panel">
            <div className="panel-title">执行预览</div>
            <ul className="step-list">
              {plan?.steps?.length ? (
                plan.steps.map((step) => (
                  <li className="step-item" key={step.step_id}>
                    {toolLabels[step.tool] ?? step.tool}
                    <span className="step-status">{renderStepStatus(step.step_id)}</span>
                  </li>
                ))
              ) : (
                <>
                  <li className="step-item">
                    解析意图与目标资产
                    <span className="step-status">未生成</span>
                  </li>
                  <li className="step-item">
                    评估滑点与路径
                    <span className="step-status">未生成</span>
                  </li>
                  <li className="step-item">
                    生成签名请求
                    <span className="step-status">未生成</span>
                  </li>
                </>
              )}
            </ul>

            <div className="panel-sub">
              <div className="panel-title">权限请求</div>
              <div className="permission-list">
                {scope ? (
                  <>
                    <div>代币：{scope.tokens.length ? scope.tokens.join("、") : "无"}</div>
                    <div>授权额度：{scope.max_amount}</div>
                    <div>
                      授权合约：
                      {scope.spender_allowlist.length
                        ? scope.spender_allowlist.join("、")
                        : "无"}
                    </div>
                    <div>风险等级：{scope.risk_level}</div>
                  </>
                ) : (
                  <>
                    <div>代币：未生成</div>
                    <div>授权额度：未生成</div>
                  </>
                )}
              </div>
            </div>

            <div className="panel-sub">
              <div className="panel-title">最近结果</div>
              {results?.length ? (
                results.map((result) => (
                  <div className="result-card" key={result.step_id}>
                    {result.status === "success"
                      ? "成功"
                      : result.status === "failed"
                        ? "失败"
                        : "跳过"}
                    · {result.step_id}
                    {result.tx_hash ? ` · ${result.tx_hash}` : ""}
                    {result.error ? ` · ${result.error.message}` : ""}
                  </div>
                ))
              ) : (
                <div className="result-card">暂无执行结果</div>
              )}
            </div>
          </aside>
        </main>

        <section className="task-section">
          <div className="panel-title">进行中的任务</div>
          <div className="task-grid">
            <TaskCard
              title="Swap USDC → ETH"
              status="executing"
              permissions={["approve:USDC", "sign"]}
              progress={0.62}
            />
            <TaskCard
              title="批量签名 3 笔交易"
              status="approved"
              permissions={["sign"]}
              progress={0.35}
            />
            <TaskCard
              title="转账 0.5 ETH 给 Alice"
              status="planned"
              permissions={["sign"]}
              progress={0.12}
            />
          </div>
          <div className="footer-note">
            执行前会展示权限、费用与风险提示，确保每一步可控可追溯。
          </div>
        </section>
      </div>
    </div>
  );
}
