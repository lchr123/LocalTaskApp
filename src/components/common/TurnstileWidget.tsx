/**
 * Cloudflare Turnstile CAPTCHA Widget
 *
 * Renders the Turnstile widget on Web platform.
 * On native platforms, returns null (CAPTCHA not needed for native apps).
 */

import React, { useEffect, useRef } from 'react';
import { Platform, View } from 'react-native';

const SITE_KEY = process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY || '';

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
}

export default function TurnstileWidget({ onVerify, onExpire }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onVerifyRef = useRef(onVerify);
  const onExpireRef = useRef(onExpire);

  // Keep refs updated without triggering re-render
  onVerifyRef.current = onVerify;
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (widgetIdRef.current) return; // Already rendered

    // Load Turnstile script if not already loaded
    const scriptId = 'cf-turnstile-script';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      document.head.appendChild(script);
    }

    const renderWidget = () => {
      if (!containerRef.current) return;
      if (widgetIdRef.current) return;

      const turnstile = (window as any).turnstile;
      if (!turnstile) {
        setTimeout(renderWidget, 300);
        return;
      }

      widgetIdRef.current = turnstile.render(containerRef.current, {
        sitekey: SITE_KEY,
        callback: (token: string) => onVerifyRef.current(token),
        'expired-callback': () => onExpireRef.current?.(),
        theme: 'light',
        size: 'normal',
      });
    };

    if ((window as any).turnstile) {
      renderWidget();
    } else {
      const script = document.getElementById(scriptId);
      script?.addEventListener('load', renderWidget);
      setTimeout(renderWidget, 500);
    }

    return () => {
      if (widgetIdRef.current && (window as any).turnstile) {
        try {
          (window as any).turnstile.remove(widgetIdRef.current);
        } catch {}
        widgetIdRef.current = null;
      }
    };
  }, []); // Empty deps - only run once on mount

  if (Platform.OS !== 'web') {
    return null;
  }

  return (
    <View style={{ alignItems: 'center', marginVertical: 12 }}>
      <div ref={containerRef as any} />
    </View>
  );
}
