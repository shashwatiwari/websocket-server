const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const Pusher = require('pusher');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const pusher = new Pusher({
    appId: "1825267",
    key: "2202a930a6cdae8b3963",
    secret: "4d18a11a2671355e6843",
    cluster: "ap2",
    useTLS: true
});

const activeConnections = {};

// Generate a unique ID for each user
const generateUniqueId = () => 'id-' + Math.random().toString(36).substr(2, 16);

const findRandomPartner = (id) => {
    const activeIds = Object.keys(activeConnections).filter(activeId => activeId !== id && !activeConnections[activeId].partnerId);
    if (activeIds.length > 0) {
        const randomId = activeIds[Math.floor(Math.random() * activeIds.length)];
        const partnerSocket = activeConnections[randomId];

        // Mark the sockets as partners
        activeConnections[id].partnerId = randomId;
        partnerSocket.partnerId = id;

        return randomId;
    }
    return null;
};

// Route for initial connection
app.post('/connect', (req, res) => {
    const id = generateUniqueId();
    console.log(`User ${id} connected`);

    // Store the user's ID
    activeConnections[id] = { id };
    console.log(activeConnections);
    const partnerId = findRandomPartner(id);
    if (partnerId) {
        console.log(`User ${id} connected to user ${partnerId}`);
        pusher.trigger('my-channel', 'partnerConnected', { id, partnerId });
    }

    res.json({ id, partnerId });
});

// Route for sending messages
app.post('/send-message', (req, res) => {
    const { message, id } = req.body;
    const { partnerId } = activeConnections[id] || {};

    if (partnerId) {
        pusher.trigger('my-channel', 'message', { message, partnerId });
        console.log(`Message from ${id} to ${partnerId}: ${message}`);
    }
    console.log(activeConnections);

    res.status(200).json({ status: 'OK' });
});

// Route for disconnecting
app.post('/disconnect', (req, res) => {
    const { id } = req.body;
    const { partnerId } = activeConnections[id] || {};

    if (partnerId) {
        pusher.trigger('my-channel', 'partnerDisconnected', { partnerId });
        console.log(`User ${id} disconnected from user ${partnerId}`);
        activeConnections[partnerId].partnerId = null;
    }

    delete activeConnections[id];
    res.sendStatus(200);
});

// Pusher authentication endpoint
app.post('/pusher/auth', (req, res) => {
    const socketId = req.body.socket_id;
    const channel = req.body.channel_name;
    const auth = pusher.authenticate(socketId, channel);
    res.send(auth);
});

app.get('/', (req, res) => {
    res.send({ msg: 'Pusher Server is running' });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
