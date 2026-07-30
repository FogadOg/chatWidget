
'use client';

import React, { useRef, useEffect, useLayoutEffect, useState, useMemo, useCallback } from 'react';
import InteractionButtons from './InteractionButtons';
import MessageBubble from './MessageBubble';
import DynamicIcon from './DynamicIcon';
import { useWidgetTranslation } from '../hooks/useWidgetTranslation';
import { useRuntimeRevision } from '../hooks/useRuntimeTranslation';
import { t as translate, getTranslations } from '../lib/i18n';
import type {
  Message,
  WidgetConfig,
  FlowButton,
  FlowResponse,
} from '../types/widget';
import { useClickedButtons, ButtonLike } from '../hooks/useClickedButtons';
import { useWidgetStyles } from '../hooks/useWidgetStyles';
import { hexToRgb, getReadableTextColor, withAlpha } from '../lib/colors';
import { COMPANY_NAME } from '../lib/constants';
import { UnreadBadge } from './UnreadBadge';
import { FOCUSABLE, FOCUS_RING } from './EmbedShell.constants';
import type { Props } from './EmbedShell.types';
import { FocusTrap } from './components/FocusTrap';
import { ChatSkeleton } from './components/ChatSkeleton';
import { Suggestions } from './components/Suggestions';
import { TypingIndicator } from './components/TypingIndicator';
import { StatusBanners } from './components/StatusBanners';
import { ConsentBanner } from './components/ConsentBanner';
import { JumpToLatest } from './components/JumpToLatest';
import { Composer } from './components/Composer';
import { LanguageMenu } from './components/LanguageMenu';
import { ThemeToggleButton } from './components/ThemeToggleButton';
import MinimalEmbedShell from './layouts/MinimalEmbedShell';
import PanelEmbedShell from './layouts/PanelEmbedShell';

// Dispatches to the runtime-selected layout shell. Kept hook-free so the
// variant branch happens before any hooks run — the classic layout's hooks
// live in ClassicEmbedShell, which only mounts for the 'classic' variant.
import { useClassicShell } from './EmbedShell.useClassicShell';
import { EmbeddedView } from './EmbeddedView';
import { FloatingView } from './FloatingView';

export default function EmbedShell(props: Props) {
  const runtimeLayoutVariant = (props.widgetConfig?.layout_variant ?? 'classic') as 'classic' | 'minimal' | 'panel';
  if (runtimeLayoutVariant === 'minimal') return <MinimalEmbedShell {...props} />;
  if (runtimeLayoutVariant === 'panel') return <PanelEmbedShell {...props} />;
  return <ClassicEmbedShell {...props} />;
}


function ClassicEmbedShell(props: Props) {
  const vm = useClassicShell(props);
  return (
    <>
      {vm.isEmbedded ? <EmbeddedView vm={vm} /> : <FloatingView vm={vm} />}
    </>
  );
}
