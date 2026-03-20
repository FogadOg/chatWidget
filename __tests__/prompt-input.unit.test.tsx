import React from 'react';
import { render, act, fireEvent, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// stable id generator
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
  PromptInputProvider,
  useProviderAttachments,
} from '../src/components/ai-elements/prompt-input';

// Helper component to capture controller/hooks
const CaptureController = ({ onReady }: any) => {
  const { usePromptInputController } = require('../src/components/ai-elements/prompt-input');
  const c = usePromptInputController();
  React.useEffect(() => { onReady(c); }, [c, onReady]);
  return null;
};

test('useProviderAttachments throws when not wrapped', () => {
  const TestComp = () => {
    const { useProviderAttachments } = require('../src/components/ai-elements/prompt-input');
    // call the hook - it should throw during render
     
    useProviderAttachments();
    return null;
  };

  expect(() => render(<TestComp />)).toThrow(
    'Wrap your component inside <PromptInputProvider> to use useProviderAttachments()'
  );
});

test('remove() revokes blob url and removes file', () => {
  let controller: any = null;
  render(
    <PromptInputProvider>
      <CaptureController onReady={(c: any) => (controller = c)} />
    </PromptInputProvider>
  );

  act(() => {
    controller.attachments.add([new File(['a'], 'one.txt', { type: 'text/plain' })]);
  });

  const file = controller.attachments.files[0];
  expect(file).toBeDefined();
  expect((global as any).URL.createObjectURL).toHaveBeenCalled();

  act(() => {
    controller.attachments.remove(file.id);
  });

  expect((global as any).URL.revokeObjectURL).toHaveBeenCalledWith(file.url);
  expect(controller.attachments.files.length).toBe(0);
});

test('submitting converts blob urls to data urls and clears on async submit', async () => {
  // mock fetch + FileReader to return a data URL
  (global as any).fetch = jest.fn().mockResolvedValue({ blob: async () => new Blob(['x'], { type: 'text/plain' }) });

  // Mock FileReader to synchronously call onloadend with a data URL
  const RealFileReader = (global as any).FileReader;
  (global as any).FileReader = class {
    result: any = null;
    onloadend: any = null;
    onerror: any = null;
    readAsDataURL() {
      this.result = 'data:mock';
      if (this.onloadend) this.onloadend();
    }
  } as any;

  let controller: any = null;
  const onSubmit = jest.fn(() => Promise.resolve());

  const { PromptInput } = require('../src/components/ai-elements/prompt-input');

  const { container } = render(
    <PromptInputProvider>
      <CaptureController onReady={(c: any) => (controller = c)} />
      <PromptInput onSubmit={onSubmit} />
    </PromptInputProvider>
  );

  // Add a file (provider will create blob: URL)
  act(() => {
    controller.attachments.add([new File(['a'], 'one.txt', { type: 'text/plain' })]);
  });

  // submit the form
  const form = container.querySelector('form') as HTMLFormElement;
  expect(form).toBeDefined();

  // ensure controller text is set and will be cleared after submit
  await act(async () => {
    controller.textInput.setInput('hello');
  });

  expect(controller.textInput.value).toBe('hello');

  await act(async () => {
    fireEvent.submit(form);
    // wait a tick for async handling
    await Promise.resolve();
  });

  await waitFor(() => expect(onSubmit).toHaveBeenCalled());

  // onSubmit should have received files with converted data url
  const submitted = onSubmit.mock.calls[0][0];
  expect(submitted.files[0].url).toBe('data:mock');

  // attachments should be cleared after successful async submit
  expect(controller.attachments.files.length).toBe(0);

  // controller text input should be cleared
  expect(controller.textInput.value).toBe('');

  // restore FileReader
  (global as any).FileReader = RealFileReader;
});
