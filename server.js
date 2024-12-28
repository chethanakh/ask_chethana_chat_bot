const WebSocket = require("ws");
const querystring = require("querystring");
const server = require("http").createServer();

const port = process.env.PORT || 3000;

var connectionList = [];

server.listen(port, () => {
    console.log("Server Started..")
})

const wss = new WebSocket.Server({
    server,
    path: "/ws"
});

wss.on("connection", function (ws, req) {
    var chatId = querystring.parse(req.url.split("?")[1]).chatId;
    if (chatId == undefined || chatId == null) {
        ws.close();
    }

    // TODO: auth check

    if (connectionList[chatId] == undefined) {
        connectionList[chatId] = [];
    }

    connectionList[chatId].push(ws);

    var initMsg = {
        "type": "init",
        "message": "connected"
    }
    sendMsg(ws, initMsg)

    ws.on("message", function (msg) {
        var message = msg.toString("utf8");

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

function sendMsg(ws, payload) {
    ws.send(JSON.stringify(payload));
}
