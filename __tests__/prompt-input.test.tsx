import React, { useEffect } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

jest.mock("lucide-react", () => ({
  PaperclipIcon: (props: any) => <span data-testid="paperclip" {...props} />,
  XIcon: (props: any) => <span data-testid="xicon" {...props} />,
  MicIcon: (props: any) => <span data-testid="mic" {...props} />,
}));

// Mock nanoid to avoid ESM import issues in test environment
jest.mock("nanoid", () => ({ nanoid: () => "test-id" }));

import {
  PromptInputProvider,
  usePromptInputController,
  PromptInputAttachment,
} from "../src/components/ai-elements/prompt-input";

const _origCreate = URL.createObjectURL;
const _origRevoke = URL.revokeObjectURL;

beforeAll(() => {
  (URL as any).createObjectURL = jest.fn((f: File) => `blob:${f.name}`);
  (URL as any).revokeObjectURL = jest.fn();
});

afterAll(() => {
  (URL as any).createObjectURL = _origCreate;
  (URL as any).revokeObjectURL = _origRevoke;
});

describe("PromptInput provider and attachments", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("attachments.add creates object URL and attachments.remove revokes URL", async () => {
    let controller: any = null;

    const Capture = ({ onReady }: { onReady: (c: any) => void }) => {
      const c = usePromptInputController();
      useEffect(() => { onReady(c); }, [c, onReady]);
      return null;
    };

    render(
      <PromptInputProvider>
        <Capture onReady={(c) => (controller = c)} />
      </PromptInputProvider>
    );

    // create a file and add it
    const file = new File(["hello"], "a.txt", { type: "text/plain" });
    act(() => {
      controller.attachments.add([file]);
    });

    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(controller.attachments.files.length).toBe(1);

    const id = controller.attachments.files[0].id;

    act(() => {
      controller.attachments.remove(id);
    });

    expect(URL.revokeObjectURL).toHaveBeenCalled();
    expect(controller.attachments.files.length).toBe(0);

    // clear should be safe
    act(() => controller.attachments.clear());

    // URL mocks are restored in afterAll
  });

  test("PromptInputAttachment remove button calls attachments.remove", () => {
    let controller: any = null;

    const Capture = ({ onReady }: { onReady: (c: any) => void }) => {
      const c = usePromptInputController();
      useEffect(() => { onReady(c); }, [c, onReady]);
      return null;
    };

    const App = () => (
      <PromptInputProvider>
        <Capture onReady={(c) => (controller = c)} />
        <AttachmentList />
      </PromptInputProvider>
    );

    const AttachmentList = () => {
      const c = usePromptInputController();
      return (
        <div>
          {c.attachments.files.map((f: any) => (
            <PromptInputAttachment key={f.id} data={f} />
          ))}
        </div>
      );
    };

    render(<App />);

    // add a file
    const file = new File(["x"], "img.png", { type: "image/png" });
    act(() => controller.attachments.add([file]));

    // Attachment should render
    expect(screen.getByText(/img.png|Image|Attachment/)).toBeInTheDocument();

    // Click the remove button (it is inside the rendered attachment)
    const btn = screen.getByLabelText("Remove attachment");
    act(() => {
      fireEvent.click(btn);
    });

    // removed
    expect(controller.attachments.files.length).toBe(0);
  });
});

describe("PromptInputSpeechButton behavior", () => {
  beforeEach(() => jest.useFakeTimers());

  test("button is enabled when SpeechRecognition exists and toggles start/stop", () => {
    const start = jest.fn();
    const stop = jest.fn();

    // fake SpeechRecognition constructor
    class FakeRec {
      onstart: any = null;
      onend: any = null;
      onresult: any = null;
      onerror: any = null;
      start() {
        start();
        if (this.onstart) this.onstart(new Event("start"));
      }
      stop() {
        stop();
        if (this.onend) this.onend(new Event("end"));
      }
    }

    // @ts-ignore
    window.SpeechRecognition = FakeRec;
    // Also set webkit for environments that check it
    // @ts-ignore
    window.webkitSpeechRecognition = FakeRec;

    const App = () => (
      <PromptInputProvider>
        <div style={{ padding: 10 }}>
          {/* import lazily to avoid other UI dependencies */}
          { }
          {/* @ts-ignore */}
          <PromptInputSpeechButtonWrapper />
        </div>
      </PromptInputProvider>
    );

    // small wrapper to import the button lazily
    const PromptInputSpeechButtonWrapper = () => {
      // dynamic import to avoid type errors in test env
       
      const { PromptInputSpeechButton } = require("../src/components/ai-elements/prompt-input");
      return <PromptInputSpeechButton />;
    };

    render(<App />);

    // recognition is set asynchronously via setTimeout(0)
    act(() => jest.advanceTimersByTime(0));

    const btn = screen.getByRole("button");
    expect(btn).toBeEnabled();

    // click to start
    act(() => fireEvent.click(btn));
    expect(start).toHaveBeenCalled();

    // click to stop
    act(() => fireEvent.click(btn));
    expect(stop).toHaveBeenCalled();
  });
});
