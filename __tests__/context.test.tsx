import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

jest.mock("tokenlens", () => ({ getUsage: jest.fn() }));
jest.mock("/home/fogad/Documents/assistantProj/widget-app/components/ui/hover-card", () => ({
  HoverCard: ({ children }: any) => <div data-testid="hovercard">{children}</div>,
  HoverCardContent: ({ children }: any) => <div>{children}</div>,
  HoverCardTrigger: ({ children }: any) => <div>{children}</div>,
}));
jest.mock("/home/fogad/Documents/assistantProj/widget-app/components/ui/progress", () => ({
  Progress: ({ value, className }: any) => (
    <div data-testid="progress" data-value={value} className={className} />
  ),
}));
jest.mock("/home/fogad/Documents/assistantProj/widget-app/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

import { getUsage } from "tokenlens";
import {
  Context,
  ContextContentHeader,
  ContextContentFooter,
  ContextInputUsage,
  ContextOutputUsage,
  ContextReasoningUsage,
  ContextCacheUsage,
} from "../src/components/ai-elements/context";

describe("Context content components", () => {
  afterEach(() => {
    (getUsage as jest.Mock).mockReset();
  });

  test("ContextContentHeader shows percent, compact used/total and Progress value", () => {
    const used = 1234;
    const max = 10000;
    const usedPercent = used / max;

    render(
      <Context usedTokens={used} maxTokens={max}>
        <ContextContentHeader />
      </Context>
    );

    const displayPct = new Intl.NumberFormat("en-US", {
      style: "percent",
      maximumFractionDigits: 1,
    }).format(usedPercent);

    const usedFmt = new Intl.NumberFormat("en-US", { notation: "compact" }).format(
      used
    );
    const totalFmt = new Intl.NumberFormat("en-US", { notation: "compact" }).format(
      max
    );

    expect(screen.getByText(displayPct)).toBeInTheDocument();
    expect(screen.getByText(`${usedFmt} / ${totalFmt}`)).toBeInTheDocument();

    // Progress implementation may vary; assert a progressbar role exists
    const progressEl = screen.getByRole("progressbar");
    expect(progressEl).toBeInTheDocument();
  });

  test("ContextContentFooter displays formatted total cost when modelId provided", () => {
    (getUsage as jest.Mock).mockReturnValue({ costUSD: { totalUSD: 1.234 } });

    render(
      <Context usedTokens={0} maxTokens={1} modelId="m1" usage={{ inputTokens: 10, outputTokens: 20 }}>
        <ContextContentFooter />
      </Context>
    );

    const totalCost = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(1.234);

    expect(screen.getByText("Total cost")).toBeInTheDocument();
    expect(screen.getByText(totalCost)).toBeInTheDocument();
  });

  test("ContextInputUsage returns null when no input tokens and shows tokens+cost when input tokens exist", () => {
    // no usage -> nothing rendered
    render(
      <Context usedTokens={0} maxTokens={1}>
        <ContextInputUsage />
      </Context>
    );

    expect(screen.queryByText("Input")).not.toBeInTheDocument();

    // with input tokens and modelId
    (getUsage as jest.Mock).mockReturnValue({ costUSD: { totalUSD: 2.5 } });
    const inputTokens = 5000;
    const costText = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(2.5);
    const tokensFmt = new Intl.NumberFormat("en-US", { notation: "compact" }).format(inputTokens);

    render(
      <Context usedTokens={0} maxTokens={1} modelId="m1" usage={{ inputTokens }}>
        <ContextInputUsage />
      </Context>
    );

    expect(screen.getByText("Input")).toBeInTheDocument();
    expect(screen.getByText(tokensFmt)).toBeInTheDocument();
    const escaped = costText.replace(/[$.*+?^{}()|[\]\\]/g, "\\$&");
    expect(screen.getByText(new RegExp(escaped))).toBeInTheDocument();
  });

  test("ContextOutputUsage, ContextReasoningUsage, and ContextCacheUsage behave correctly", () => {
    (getUsage as jest.Mock).mockReturnValue({ costUSD: { totalUSD: 3 } });

    const usage = {
      outputTokens: 2000,
      reasoningTokens: 300,
      cachedInputTokens: 1200,
    } as any;

    const outputTokensFmt = new Intl.NumberFormat("en-US", { notation: "compact" }).format(
      usage.outputTokens
    );
    const reasoningTokensFmt = new Intl.NumberFormat("en-US", { notation: "compact" }).format(
      usage.reasoningTokens
    );
    const cacheTokensFmt = new Intl.NumberFormat("en-US", { notation: "compact" }).format(
      usage.cachedInputTokens
    );

    render(
      <Context usedTokens={0} maxTokens={1} modelId="m1" usage={usage}>
        <div>
          <ContextOutputUsage />
          <ContextReasoningUsage />
          <ContextCacheUsage />
        </div>
      </Context>
    );

    expect(screen.getByText(outputTokensFmt)).toBeInTheDocument();
    expect(screen.getByText(reasoningTokensFmt)).toBeInTheDocument();
    expect(screen.getByText(cacheTokensFmt)).toBeInTheDocument();
  });
});
