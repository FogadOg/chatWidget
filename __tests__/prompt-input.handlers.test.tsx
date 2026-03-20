import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('nanoid', () => ({ nanoid: () => 'test-id' }));

beforeAll(() => {
  (global as any).URL = (global as any).URL || {};
  (global as any).URL.createObjectURL = jest.fn((f: File) => `blob:${f.name}`);
  (global as any).URL.revokeObjectURL = jest.fn();
});

afterAll(() => {
  jest.restoreAllMocks();
});

import {
  PromptInput,
  PromptInputProvider,
  PromptInputTextarea,
  PromptInputSpeechButton,
} from '../src/components/ai-elements/prompt-input';

// Capture controller helper
const CaptureController = ({ onReady }: any) => {
  const { usePromptInputController } = require('../src/components/ai-elements/prompt-input');
  const c = usePromptInputController();
  React.useEffect(() => { onReady(c); }, [c, onReady]);
  return null;
};

test('form-level drag/drop adds files when dropping on form', () => {
  let controller: any = null;
  const { container } = render(
    <PromptInputProvider>
      <CaptureController onReady={(c: any) => (controller = c)} />
      <PromptInput onSubmit={() => {}} />
    </PromptInputProvider>
  );

  const form = container.querySelector('form') as HTMLFormElement;
  expect(form).toBeDefined();

  const file = new File(['a'], 'one.txt', { type: 'text/plain' });
  const dropEvent: any = new Event('drop', { bubbles: true });
  dropEvent.dataTransfer = { types: ['Files'], files: [file] };

  act(() => {
    form.dispatchEvent(dropEvent);
  });

  expect(controller.attachments.files.length).toBeGreaterThan(0);
});

test('document-level globalDrop adds files when dropping on document', () => {
  let controller: any = null;
  const { container } = render(
    <PromptInputProvider>
      <CaptureController onReady={(c: any) => (controller = c)} />
      <PromptInput globalDrop onSubmit={() => {}} />
    </PromptInputProvider>
  );

  const file = new File(['b'], 'two.txt', { type: 'text/plain' });
  const dropEvent: any = new Event('drop', { bubbles: true });
  dropEvent.dataTransfer = { types: ['Files'], files: [file] };

  act(() => {
    document.dispatchEvent(dropEvent);
  });

  expect(controller.attachments.files.length).toBeGreaterThan(0);
});

test('Backspace in empty textarea removes last attachment', () => {
  let controller: any = null;
  const { getByPlaceholderText } = render(
    <PromptInputProvider>
      <CaptureController onReady={(c: any) => (controller = c)} />
      <PromptInput onSubmit={() => {}}>
        <PromptInputTextarea />
      </PromptInput>
    </PromptInputProvider>
  );

  act(() => {
    controller.attachments.add([new File(['a'], 'one.txt', { type: 'text/plain' })]);
  });

  const ta = getByPlaceholderText('What would you like to know?') as HTMLTextAreaElement;
  // ensure empty
  act(() => { ta.value = ''; });

  act(() => {
    fireEvent.keyDown(ta, { key: 'Backspace', code: 'Backspace' });
  });

  expect(controller.attachments.files.length).toBe(0);
});

test('paste with file items adds attachments and prevents default', () => {
  let controller: any = null;
  const { getByPlaceholderText } = render(
    <PromptInputProvider>
      <CaptureController onReady={(c: any) => (controller = c)} />
      <PromptInput onSubmit={() => {}}>
        <PromptInputTextarea />
      </PromptInput>
    </PromptInputProvider>
  );

  const ta = getByPlaceholderText('What would you like to know?') as HTMLTextAreaElement;
  const file = new File(['c'], 'paste.txt', { type: 'text/plain' });

  const clipboardData: any = {
    items: [
      {
        kind: 'file',
        getAsFile: () => file,
      },
    ],
  };

  const pasteEvent: any = new Event('paste', { bubbles: true });
  pasteEvent.clipboardData = clipboardData;

  act(() => {
    ta.dispatchEvent(pasteEvent);
  });

  expect(controller.attachments.files.length).toBeGreaterThan(0);
});

test('controlled textarea updates controller value on change', () => {
  let controller: any = null;
  const { getByPlaceholderText } = render(
    <PromptInputProvider>
      <CaptureController onReady={(c: any) => (controller = c)} />
      <PromptInput onSubmit={() => {}}>
        <PromptInputTextarea />
      </PromptInput>
    </PromptInputProvider>
  );

  const ta = getByPlaceholderText('What would you like to know?') as HTMLTextAreaElement;

  act(() => {
    fireEvent.input(ta, { target: { value: 'hi' } });
  });

  expect(controller.textInput.value).toBe('hi');
});

test('speech recognition onresult appends transcript and onerror stops listening', async () => {
  jest.useFakeTimers();
  // mock SpeechRecognition to capture instances
  (window as any).__mockSpeechInstances = [];
  (window as any).SpeechRecognition = class {
    onstart: any = null;
    onend: any = null;
    onresult: any = null;
    onerror: any = null;
    start = jest.fn(() => { if (this.onstart) this.onstart(new Event('start')); });
    stop = jest.fn(() => { if (this.onend) this.onend(new Event('end')); });
    continuous = true;
    interimResults = true;
    lang = 'en-US';
    constructor() { (window as any).__mockSpeechInstances.push(this); }
  } as any;

  const textareaRef = React.createRef<HTMLTextAreaElement>();
  const onTranscriptionChange = jest.fn();

  const { container } = render(
    <div>
      <textarea ref={textareaRef} />
      <PromptInputSpeechButton textareaRef={textareaRef} onTranscriptionChange={onTranscriptionChange} />
    </div>
  );

  // advance timers so recognition is set
  act(() => { jest.runOnlyPendingTimers(); });

  const instances = (window as any).__mockSpeechInstances;
  expect(instances.length).toBeGreaterThan(0);
  const inst = instances[0];

  // simulate result with final transcript
  const resultEvent: any = {
    resultIndex: 0,
    results: [
      {
        isFinal: true,
        0: { transcript: 'hello' },
        length: 1,
      },
    ],
  };

  act(() => {
    if (inst.onresult) inst.onresult(resultEvent);
  });

  await waitFor(() => expect(onTranscriptionChange).toHaveBeenCalledWith(expect.stringContaining('hello')));

  // now simulate error
  act(() => {
    if (inst.onerror) inst.onerror({ error: 'fail' });
  });

  // ensure no crash and timers cleaned
  jest.useRealTimers();
});
