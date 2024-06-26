const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server, clientTracking: true });

// Store active connections
const activeConnections = {};

// Define your routes here
app.get('/', (req, res) => {
    res.json({ message: 'Hello from the server dude!' });
});

wss.on('connection', (ws) => {
    const id = generateUniqueId();
    console.log(`User ${id} connected`);

    // Store the user's socket
    activeConnections[id] = ws;

    // Find a random partner to connect with
    const partnerId = findRandomPartner(id);

    if (partnerId) {
        // Notify both users about the connection
        ws.send(JSON.stringify({ type: 'partnerConnected', id: partnerId }));
        activeConnections[partnerId].send(JSON.stringify({ type: 'partnerConnected', id: id }));
        console.log(`User ${id} connected to user ${partnerId}`);
    }

    ws.on('message', (message) => {
        const parsedMessage = JSON.parse(message);
        const { type, data } = parsedMessage;

        const partnerId = ws.partnerId;
        if (partnerId) {
            const partnerSocket = activeConnections[partnerId];
            if (partnerSocket) {
                partnerSocket.send(JSON.stringify({ type, data }));
            }
        }

        if (type === 'signal') {
            const partnerSocket = activeConnections[partnerId];
            if (partnerSocket) {
                partnerSocket.send(JSON.stringify({ type: 'signal', data }));
            }
        }

        if (type === 'stream') {
            const partnerSocket = activeConnections[partnerId];
            if (partnerSocket) {
                partnerSocket.send(JSON.stringify({ type: 'stream', data }));
            }
        }
    });

    ws.on('close', () => {
        console.log(`User ${id} disconnected`);

        const partnerId = ws.partnerId;
        if (partnerId) {
            const partnerSocket = activeConnections[partnerId];
            if (partnerSocket) {
                partnerSocket.send(JSON.stringify({ type: 'partnerDisconnected' }));
            }
        }

        // Remove the user's socket from active connections
        delete activeConnections[id];
    });
});

function findRandomPartner(id) {
    const activeIds = Object.keys(activeConnections).filter(activeId => activeId !== id);
    if (activeIds.length > 0) {
        const randomId = activeIds[Math.floor(Math.random() * activeIds.length)];
        const partnerSocket = activeConnections[randomId];

        // Mark the sockets as partners
        activeConnections[id].partnerId = randomId;
        partnerSocket.partnerId = id;

        return randomId;
    }
    return null;
}

function generateUniqueId() {
    return 'id-' + Math.random().toString(36).substr(2, 16);
}

app.get('*', (req, res) => {
    res.send({ msg: "hey 404" });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
