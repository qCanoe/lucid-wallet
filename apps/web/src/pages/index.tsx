import React from "react";
import { TaskCard } from "../components/TaskCard";

export function HomePage(): JSX.Element {
  return (
    <div style={{ padding: 24 }}>
      <h1>Lucid Wallet MVP</h1>
      <TaskCard
        title="Swap USDC → ETH"
        status="planned"
        permissions={["approve:USDC", "sign"]}
        progress={0.2}
      />
    </div>
  );
}
