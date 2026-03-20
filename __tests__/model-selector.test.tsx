import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

jest.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogTitle: ({ children }: any) => <h2 data-testid="dialog-title">{children}</h2>,
  DialogTrigger: ({ children }: any) => <button data-testid="dialog-trigger">{children}</button>,
}));

// Also mock radix dialog to be safe in case other modules import it directly
jest.mock("@radix-ui/react-dialog", () => ({
  Dialog: ({ children }: any) => <div>{children}</div>,
  DialogTrigger: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <div>{children}</div>,
  DialogPortal: ({ children }: any) => <div>{children}</div>,
}));

jest.mock("@/components/ui/command", () => ({
  Command: ({ children }: any) => <div>{children}</div>,
  CommandInput: (props: any) => <input {...props} />,
  CommandList: (props: any) => <div {...props} />,
  CommandEmpty: (props: any) => <div {...props} />,
  CommandGroup: (props: any) => <div {...props} />,
  CommandItem: (props: any) => <div {...props} />,
  CommandSeparator: (props: any) => <div {...props} />,
  CommandDialog: (props: any) => <div {...props} />,
  CommandShortcut: (props: any) => <span {...props} />,
}));

const {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorLogo,
  ModelSelectorTrigger,
  ModelSelectorInput,
} = require("../src/components/ai-elements/model-selector");


describe("ModelSelector components", () => {
  test("ModelSelectorContent renders children and title is present", () => {
    const el = ModelSelectorContent({ title: "Choose model", children: "Hello Models" });
    const serialized = JSON.stringify(el, (_key, val) => {
      // avoid circular by returning simple representations for functions
      if (typeof val === "function") return "[fn]";
      return val;
    });

    expect(serialized).toContain("Hello Models");
    expect(serialized).toContain("Choose model");
  });

  test("ModelSelectorLogo uses provider into src and alt text", () => {
    render(<ModelSelectorLogo provider="openai" />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "https://models.dev/logos/openai.svg");
    expect(img).toHaveAttribute("alt", "openai logo");
  });

  test("ModelSelectorTrigger and Input render with provided props", () => {
    const triggerEl = ModelSelectorTrigger({ children: "Open" });
    const inputEl = ModelSelectorInput({ placeholder: "Search models" });

    // inspect props without mounting
    expect(triggerEl.props.children).toBe("Open");
    expect(inputEl.props.placeholder).toBe("Search models");
  });
});
