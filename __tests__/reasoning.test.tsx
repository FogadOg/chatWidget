import React from "react";
import { act, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

jest.useFakeTimers();

jest.mock("lucide-react", () => ({
  BrainIcon: (props: any) => <span data-testid="brain" {...props} />,
  ChevronDownIcon: (props: any) => <span data-testid="chev" {...props} />,
}));

import {
  Reasoning,
  ReasoningTrigger,
  useReasoning,
} from "../src/components/ai-elements/reasoning";

describe("Reasoning components", () => {
  test("useReasoning throws when used outside Reasoning provider", () => {
    const Consumer = () => {
      // using the hook outside provider should throw
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useReasoning();
      return null;
    };

    expect(() => render(<Consumer />)).toThrow(
      "Reasoning components must be used within Reasoning"
    );
  });

  test("Reasoning auto-closes after AUTO_CLOSE_DELAY when defaultOpen true and not streaming", () => {
    const { getByTestId } = render(
      <Reasoning defaultOpen>
        <ReasoningTrigger />
      </Reasoning>
    );

    // initially open -> Chevron should have rotate-180 class
    const chev = getByTestId("chev");
    expect(chev).toBeInTheDocument();
    // initial class prop may contain rotate-180
    expect(chev.getAttribute("class") || "").toContain("rotate-180");

    // advance time to trigger auto-close (AUTO_CLOSE_DELAY is 1000ms)
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // after auto-close, class should indicate closed state
    expect(chev.getAttribute("class") || "").toContain("rotate-0");
  });

  test("Reasoning tracks duration when streaming starts and ends", () => {
    // control Date.now
    let now = 1000000;
    const spyNow = jest.spyOn(Date, "now").mockImplementation(() => now);

    const { rerender } = render(
      <Reasoning isStreaming={true} defaultOpen={false}>
        <ReasoningTrigger />
      </Reasoning>
    );

    // start streaming: effect schedules startTime on next tick
    act(() => jest.advanceTimersByTime(0));

    // move time forward 2500ms
    now += 2500;

    // stop streaming by rerendering with isStreaming=false
    rerender(
      <Reasoning isStreaming={false} defaultOpen={false}>
        <ReasoningTrigger />
      </Reasoning>
    );

    // effect schedules duration update on next tick
    act(() => jest.advanceTimersByTime(0));

    // defaultGetThinkingMessage should now report duration (ceil(2500/1000)=3)
    expect(screen.getByText(/Thought for 3 seconds/)).toBeInTheDocument();

    spyNow.mockRestore();
  });
});
