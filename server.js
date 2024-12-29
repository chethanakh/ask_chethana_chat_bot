require('dotenv').config();
const WebSocket = require("ws");
const querystring = require("querystring");
const ChatGPT = require("./src/ChatGPT.cjs");
const server = require("http").createServer();

const port = process.env.PORT || 3000;

var connectionList = [];
var systemStatus = [];

server.listen(port, () => {
    console.log("Server Started..")
})

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

    ChatGPT.askOnThreads(chatId, "Introduce your self and ask the help.", 'user').then(function (response) {
        sendMsg(ws, "message", response)
        setSystemStatus(chatId, "active");
    });
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
