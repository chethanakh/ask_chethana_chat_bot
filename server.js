require('dotenv').config();
const WebSocket = require("ws");
const querystring = require("querystring");
const express = require('express');
const ChatGPT = require("./src/ChatGPT.cjs");

const app = express();
app.use(express.json());
app.use(express.static('public'));

const port = process.env.PORT || 3000;

var connectionList = [];
var systemStatus = [];

const server = app.listen(port, () => {
    console.log("Server Started..")
})

app.get('/', (req, res) => {
    res.render(path.join(__dirname, 'public', 'index.html',));
});

const wss = new WebSocket.Server({
    server,
    path: "/ws"
});

wss.on("connection", async function (ws, req) {
    var chatId = await ChatGPT.createThreads();

    sendMsg(ws, "init", "Connected", { chatId: chatId })

    if (chatId == undefined || chatId == null) {
        ws.close();
    }

    // TODO: auth check

    if (connectionList[chatId] == undefined) {
        connectionList[chatId] = [];
    }

    setSystemStatus(chatId, "waiting");


    connectionList[chatId].push(ws);

    // ChatGPT.askOnThreads(chatId, "Introduce your self and ask the help.", 'user').then(function (response) {
    //     sendMsg(ws, "message", response)
    //     setSystemStatus(chatId, "active");
    // });

    sendMsg(ws, "message", "I am your personal AI assistant here to provide information about Chethana and his professional works. If you have any questions regarding Chethana's experience, skills, projects, or anything related to his professional background, feel free to ask for help!")
    setSystemStatus(chatId, "active");

    ws.on("message", function (msg) {
        if (getSystemStatus(chatId) != "active") {
            sendMsg(ws, "status", 'system is already running another process..')
            return;
        }
        var message = msg.toString("utf8");
        var payload = JSON.parse(message);

        if (payload.type === "message") {
            setSystemStatus(chatId, "waiting");
            ChatGPT.askOnThreads(chatId, payload.message, 'user').then(function (response) {
                sendMsg(ws, "message", response)
                setSystemStatus(chatId, "active");
            });
        }
    })

    ws.on("close", function () {
        disconnectConnections(chatId, ws)
    })
})


function disconnectConnections(chatId, ws) {
    connectionList[chatId].forEach(function (conn, i) {
        if (conn === ws) {
            connectionList[chatId].splice(i, 1);
        }
    });
}

function sendMsg(ws, type = "message", message = "", data = {}) {
    var payload = {
        "type": type,
        "message": message,
        "data": data
    }
    ws.send(JSON.stringify(payload));
}

function setSystemStatus(chatId, status) {
    systemStatus[chatId] = status;
}

function getSystemStatus(chatId) {
    return systemStatus[chatId];
}
