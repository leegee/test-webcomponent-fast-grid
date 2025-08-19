export class BenchmarkHelper {
    receivedMessages = 0;
    startTime = 0;
    fpsSamples: number[] = [];

    startBenchmark() {
        console.log('Benchmarking started...');
        this.measureFPS();
    }

    recordMessage() {
        if (this.receivedMessages === 0) {
            this.startTime = performance.now();
        }

        this.receivedMessages++;
        this.measureRenderTime();

        if (this.receivedMessages % 1000 === 0) {
            const elapsed = (performance.now() - this.startTime) / 1000;
            console.log(`Received: ${this.receivedMessages} messages in ${elapsed.toFixed(2)}s`);
            console.log(`Throughput: ${(this.receivedMessages / elapsed).toFixed(2)} messages/sec`);
            this.logMemoryUsage();
            this.logFPS();
        }
    }

    measureRenderTime() {
        performance.mark('start-update');
        requestAnimationFrame(() => {
            performance.mark('end-update');
            performance.measure('UI Update', 'start-update', 'end-update');
            // const entry = performance.getEntriesByName('UI Update').pop();
            // console.log(`UI update took ${entry.duration.toFixed(2)} ms`);
        });
    }

    measureFPS() {
        let lastFrameTime = performance.now();
        const checkFrame = () => {
            const now = performance.now();
            const fps = 1000 / (now - lastFrameTime);
            lastFrameTime = now;
            this.fpsSamples.push(fps);
            requestAnimationFrame(checkFrame);
        };
        requestAnimationFrame(checkFrame);
    }

    logMemoryUsage() {
        if (performance.memory) {
            console.log(`Heap Used: ${(performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
        } else {
            console.log("Memory API not available.");
        }
    }

    logFPS() {
        const avgFPS = this.fpsSamples.length
            ? this.fpsSamples.reduce((a, b) => a + b, 0) / this.fpsSamples.length
            : 0;
        console.log(`Average FPS: ${avgFPS.toFixed(2)}`);
    }
}
