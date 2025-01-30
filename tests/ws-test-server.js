// // Send random test data often

import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';

const SEND_INTERVAL_MS = 1000;
const MAX_ROWS = 30;

dotenv.config();

console.log(`Starting test server at ${process.env.VITE_WEBSOCKET_PORT}`)

const wss = new WebSocketServer({ port: process.env.VITE_WEBSOCKET_PORT });

wss.on('listening', () => {
    console.log(`Test server listening on ${process.env.VITE_WEBSOCKET_PORT}`);
});

wss.on('error', (err) => {
    console.error('WebSocket server error:', err);
});

wss.on('connection', (ws) => {
    console.log('Client connected');
    ws.on('message', (message) => {
        console.log('Received:', message.toString());
    });
    sendTest(ws);
});

function sendTest(ws) {
    const interval = setInterval(() => {
        const rowsToAdd = Math.floor(Math.random() * MAX_ROWS);
        let testData = [];
        for (let id = 0; id < rowsToAdd; id++) {
            testData.push(
                {
                    id: id.toString(),
                    name: 'Person ' + id + ' ' + Math.random(),
                    age: Math.random(),
                    location: 'Place ' + id
                },
            );
        }
        ws.send(JSON.stringify(testData));
    }, SEND_INTERVAL_MS);

    ws.on('close', () => {
        console.log('Client disconnected');
        clearInterval(interval);
    });
};











