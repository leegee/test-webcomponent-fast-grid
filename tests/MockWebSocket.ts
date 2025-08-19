export let mockWebSocket;

export class MockWebSocket {
    static readonly CONNECTING = 0;
    static readonly OPEN = 1;
    static readonly CLOSING = 2;
    static readonly CLOSED = 3;
    listeners;
    readyState;
    constructor() {
        this.listeners = {};
        mockWebSocket = this;
        this.readyState = 1; // OPEN
    }
    addEventListener(event, callback) {
        this.listeners[event] = callback;
    }
    close() { }
    send(data) {
        setTimeout(() => { // Simulate a delayed response
            if (this.listeners['message']) {
                this.listeners['message']({ data });
            }
        }, 10);
    }
};
