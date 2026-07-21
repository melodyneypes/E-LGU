# Network Interceptor 303 Handling Design

## Problem

The global fetch interceptor treats every response with `response.ok === false` as an application error. HTTP redirects such as `303 See Other` are intentionally outside the 2xx range, so valid Next.js Server Action redirects are incorrectly displayed as errors. The interceptor then reads the React Server Component transport body as plain text, producing messages beginning with values such as `1:I[...]`.

## Goal

Stop false `Error 303` messages without suppressing genuine client or server failures.

## Design

The interceptor will report HTTP responses only when their status is `400` or higher. Responses in the `300–399` range will be returned untouched so Next.js can process redirects normally.

The interceptor will also recognize React Server Component responses through the `text/x-component` content type and avoid presenting their protocol payload as a user-facing message. This is a defense for framework transport responses; JSON API errors and ordinary 4xx/5xx server responses retain their existing toast handling.

Network exceptions such as failed connections retain the existing behavior. Abort errors remain silent.

## Scope

- Modify only the shared network interceptor and its focused tests.
- Do not change logout, login, service navigation, Server Actions, or API behavior.
- Do not modify the existing Engineer fees work or untracked Occupancy module.

## Testing

Regression tests will verify that:

- A `303` response does not produce an error toast.
- Other `3xx` responses do not produce error toasts.
- React Server Component payloads are never rendered as raw error text.
- JSON and non-RSC `4xx/5xx` responses still use the existing error path.
- Network failures and abort handling remain unchanged.

Verification will include the focused tests, ESLint, and TypeScript checking.

## Success Criteria

- Valid Next.js redirects no longer display `Error 303`.
- Raw RSC payloads such as `1:I[...]` are not shown to users.
- Genuine HTTP and network failures continue to be reported.
