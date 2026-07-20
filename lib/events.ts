import { EventEmitter } from "events";

const globalForEvents = globalThis as unknown as {
    sseEmitter: EventEmitter | undefined;
};

export const sseEmitter = globalForEvents.sseEmitter ?? new EventEmitter();
sseEmitter.setMaxListeners(100);

if (process.env.NODE_ENV !== "production") {
    globalForEvents.sseEmitter = sseEmitter;
}
