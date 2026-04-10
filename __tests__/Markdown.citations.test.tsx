/**
 * @jest-environment jsdom
 *
 * Tests for the [n] citation-token resolution in the Markdown component.
 *
 * Strategy: the `processed` useMemo converts all [n] tokens into markdown links
 * before passing them to ReactMarkdown.  A custom `a` component renderer then
 * displays them as superscripts.
 *
 *   URL source  → [n](url "tooltip")   → components.a called with real href
 *   non-URL     → [n](#fn-n "tooltip") → components.a called with #fn- href
 *   out-of-range → [4] unchanged
 */

import React from "react";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom";

// ------------------------------------------------------------------ mocks --

let capturedContent: string | undefined;
let capturedComponents: Record<string, any> | undefined;

jest.mock("react-markdown", () => {
  return function ReactMarkdownMock({ children, components }: any) {
    capturedContent = typeof children === "string" ? children : undefined;
    capturedComponents = components;
    return <div data-testid="md">{children}</div>;
  };
});

jest.mock("remark-gfm", () => ({ __esModule: true, default: () => null }));

// ---------------------------------------------------------------- subject --

import Markdown from "../src/components/ai-elements/Markdown";

// ------------------------------------------------------------------ tests --

beforeEach(() => {
  capturedContent = undefined;
  capturedComponents = undefined;
});

describe("Markdown — pass 1: title-text matching", () => {
  it("converts 'Title[1]' into '[Title](url)' so the phrase is the link", () => {
    const sources = [{ url: "https://docs.example.com", title: "Getting Started Guide" }];
    render(<Markdown content="See the Getting Started Guide[1] for details." sources={sources} />);
    expect(capturedContent).toContain("[Getting Started Guide](https://docs.example.com");
    // [1] should NOT appear as a bare token — it was consumed by the title match
    expect(capturedContent).not.toMatch(/\[1\]\s*\(/);
  });

  it("works for non-URL sources too", () => {
    const sources = [{ title: "Internal KB Article" }];
    render(<Markdown content="Internal KB Article[1] has the answer." sources={sources} />);
    expect(capturedContent).toContain("[Internal KB Article](#fn-1");
  });

  it("handles multiple citations in one message", () => {
    const sources = [
      { url: "https://a.com", title: "Guide A" },
      { url: "https://b.com", title: "Guide B" },
    ];
    render(<Markdown content="See Guide A[1] and Guide B[2]." sources={sources} />);
    expect(capturedContent).toContain("[Guide A](https://a.com");
    expect(capturedContent).toContain("[Guide B](https://b.com");
  });

  it("matches a separator-split segment when LLM uses a partial title", () => {
    // LLM writes the segment after the separator, not the full stored title.
    // e.g. stored title = "Getting Started - Official Documentation"
    //      LLM writes   = "Official Documentation[1]"
    const sources = [
      { url: "https://docs.com", title: "Getting Started - Official Documentation" },
    ];
    render(<Markdown content="See Official Documentation[1] for reference." sources={sources} />);
    expect(capturedContent).toContain("[Official Documentation](https://docs.com");
    expect(capturedContent).not.toMatch(/\[1\]/);
  });

  it("matches the prefix segment before a separator", () => {
    // e.g. stored title = "Getting Started - Official Documentation"
    //      LLM writes   = "Getting Started[1]"
    const sources = [
      { url: "https://docs.com", title: "Getting Started - Official Documentation" },
    ];
    render(<Markdown content="See Getting Started[1] to begin." sources={sources} />);
    expect(capturedContent).toContain("[Getting Started](https://docs.com");
    expect(capturedContent).not.toMatch(/\[1\]/);
  });

  it("matches segment after colon separator", () => {
    const sources = [
      { url: "https://kb.com", title: "Product Docs: Installation Guide" },
    ];
    render(<Markdown content="Follow Installation Guide[1] carefully." sources={sources} />);
    expect(capturedContent).toContain("[Installation Guide](https://kb.com");
  });
});

describe("Markdown — pass 2: bare [n] fallback", () => {
  it("converts [1] to a markdown link for URL sources", () => {
    const sources = [{ url: "https://docs.example.com/page", title: "Docs page" }];
    render(<Markdown content="See this [1] for details." sources={sources} />);
    expect(capturedContent).toContain('[1](https://docs.example.com/page "Docs page")');
    expect(capturedContent).not.toContain("#fn-");
  });

  it("escapes double-quotes in the tooltip", () => {
    const sources = [{ url: "https://x.com", title: 'Say "hello"' }];
    render(<Markdown content="[1]" sources={sources} />);
    expect(capturedContent).toContain('[1](https://x.com "Say \\"hello\\"")');
  });

  it("uses only the title as tooltip (snippet excluded to avoid newline issues)", () => {
    const sources = [{ url: "https://x.com", title: "Guide", snippet: "Short snippet" }];
    render(<Markdown content="[1]" sources={sources} />);
    expect(capturedContent).toContain('[1](https://x.com "Guide")');
    expect(capturedContent).not.toContain("Short snippet");
  });
});

describe("Markdown — pass 2: bare [n] with non-URL source", () => {
  it("converts [1] to a #fn- anchor for non-URL sources", () => {
    const sources = [{ title: "Internal KB article", snippet: "Some info" }];
    render(<Markdown content="Refer to [1]." sources={sources} />);
    expect(capturedContent).toContain("[1](#fn-1");
    expect(capturedContent).not.toContain("[[CITE:");
  });

  it("uses only the title as tooltip (snippet excluded)", () => {
    const sources = [{ title: "Policy doc", snippet: "Details here" }];
    render(<Markdown content="[1]" sources={sources} />);
    expect(capturedContent).toContain('[1](#fn-1 "Policy doc")');
    expect(capturedContent).not.toContain("Details here");
  });
});

describe("Markdown — pass 2: edge cases", () => {
  it("leaves [n] unchanged when the index is out of range", () => {
    const sources = [{ url: "https://a.com" }, { url: "https://b.com" }];
    render(<Markdown content="See [4]." sources={sources} />);
    expect(capturedContent).toContain("[4]");
    expect(capturedContent).not.toContain("[4](");
  });

  it("does not modify content when no sources provided", () => {
    render(<Markdown content="See [1]." />);
    expect(capturedContent).toBe("See [1].");
  });

  it("handles empty sources array", () => {
    render(<Markdown content="[1]" sources={[]} />);
    expect(capturedContent).toBe("[1]");
  });

  it("handles mixed URL and non-URL in one message", () => {
    const sources = [
      { url: "https://a.com", title: "A" },
      { title: "B \u2014 no URL" },
      { url: "https://c.com" },
    ];
    render(<Markdown content="[1], [2] and [3]." sources={sources} />);
    expect(capturedContent).toContain('[1](https://a.com');
    expect(capturedContent).toContain("[2](#fn-2");
    expect(capturedContent).toContain('[3](https://c.com');
  });
});

describe("Markdown — a component renderer", () => {
  it("renders URL citation as <sup><a href>", () => {
    render(<Markdown content="[1]" sources={[{ url: "https://x.com", title: "X" }]} />);
    expect(capturedComponents?.a).toBeDefined();

    const { container } = render(
      <>{capturedComponents!.a({ href: "https://x.com", title: "X", children: "1" })}</>
    );
    const a = container.querySelector("sup a");
    expect(a).toBeInTheDocument();
    expect(a).toHaveTextContent("[1]");
    expect(a).toHaveAttribute("href", "https://x.com");
    expect(a).toHaveAttribute("target", "_blank");
  });

  it("renders non-URL citation as <sup> badge with tooltip", () => {
    render(<Markdown content="[1]" sources={[{ title: "KB" }]} />);

    const { container } = render(
      <>{capturedComponents!.a({ href: "#fn-1", title: "KB", children: "1" })}</>
    );
    const sup = container.querySelector("sup");
    expect(sup).toBeInTheDocument();
    expect(sup).toHaveTextContent("[1]");
    expect(sup).toHaveAttribute("title", "KB");
    expect(container.querySelector("sup a")).not.toBeInTheDocument();
  });

  it("renders non-numeric link text as a normal external link", () => {
    render(<Markdown content="[click here](https://x.com)" sources={[]} />);

    const { container } = render(
      <>{capturedComponents!.a({ href: "https://x.com", children: "click here" })}</>
    );
    const a = container.querySelector("a");
    expect(a).toBeInTheDocument();
    expect(a).toHaveTextContent("click here");
    expect(container.querySelector("sup")).not.toBeInTheDocument();
  });
});
