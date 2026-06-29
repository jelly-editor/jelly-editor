import posthog from "posthog-js";

const API_KEY = "phc_kBFpEpfrXfvDpAqBGQqcVmGKsxmDo9j4UzWTKpBNRJGZ";
const HOST = "https://us.i.posthog.com";

export function initAnalytics(enabled: boolean) {
  posthog.init(API_KEY, {
    api_host: HOST,
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    disable_session_recording: true,
    persistence: "localStorage",
    opt_out_capturing_by_default: !enabled,
  });
}

export function capture(event: string, properties?: Record<string, unknown>) {
  if (!posthog.__loaded) return;
  posthog.capture(event, properties);
}

export function optIn() {
  posthog.opt_in_capturing();
}

export function optOut() {
  capture("telemetry_opted_out");
  posthog.opt_out_capturing();
}
