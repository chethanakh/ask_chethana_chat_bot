const axios = require('axios');
const delay = (ms) => new Promise((res) => setTimeout(res, ms));
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const FunctionCaller = require("./FunctionCaller.cjs");

const headers = {
    'Authorization': `Bearer ${OPENAI_API_KEY}`,
    'Content-Type': 'application/json',
    'OpenAI-Beta': 'assistants=v2'
}
exports.createThreads = async () => {
    const response = await axios.post('https://api.openai.com/v1/threads', {}, {
        headers: headers
    });
    return response.data.id;
}

exports.askOnThreads = async (threadId, message, role = "user") => {
    await askAs(threadId, message, role);

    const { status, runId, runData } = await processThread(threadId)

    return await finalizeOutput(threadId, runId, status, runData);
}

async function askAs(threadId, message, role = "user") {
    return await axios.post(`https://api.openai.com/v1/threads/${threadId}/messages`, {
        "role": role,
        "content": message
    }, {
        headers: headers
    });
}

async function processThread(threadId, runId = null, status = "queued") {
    var runData = {};
    if (runId == null || runId == undefined) {
        var createRun = await axios.post(`https://api.openai.com/v1/threads/${threadId}/runs`, {
            "assistant_id": "asst_Hwkx0Dc8G8ozHucZDdJhiJxK",
        },
            { headers: headers }
        )

        status = createRun.data.status;
        runId = createRun.data.id;
        runData = createRun.data
    }
    console.log("Processing GPT job: " + status);

    while (status === "queued" || status === "in_progress") {
        delay(100);
        console.log("Processing GPT job: " + status);
        var run = await axios.get(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
            headers: headers
        })
        status = run.data.status
        runData = run.data
    }

    return { status, runId, runData }
}

async function finalizeOutput(threadId, runId, status, runData) {
    if (status === "completed") {
        var messageList = await axios.get(`https://api.openai.com/v1/threads/${threadId}/messages`, {
            headers: headers
        })
        var latestMsg = messageList.data.data[0]
        console.log("GPT process done.");

        return latestMsg.content[0].text.value;
    }

    if (status === "requires_action") {
        var requiredAction = runData['required_action'];
        if (requiredAction['type'] === "submit_tool_outputs") {
            var toolsCall = requiredAction['submit_tool_outputs']['tool_calls'][0];
            var functionObj = toolsCall['function'];
            if (functionObj) {
                var response = await FunctionCaller.call(functionObj['name'], JSON.parse(functionObj['arguments']));
                return await submitTheOutput(threadId, runId, toolsCall['id'], response)
            }
        }

    }
}

async function submitTheOutput(threadId, runId, callId, output) {
    var submitOutput = await axios.post(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}/submit_tool_outputs`, {
        "tool_outputs": [
            {
                "tool_call_id": callId,
                "output": output
            }
        ]
    },
        { headers: headers }
    )

    const { status, runData } = await processThread(threadId, submitOutput.data['id'], submitOutput.data['status'])

    return await finalizeOutput(threadId, runId, status, runData);
}

exports.call = async () => {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        // model: "gpt-3.5-turbo",
        messages: [{ role: "system", content: startSystemPrompt }]
    }, {
        headers: headers
    });
    return response.data.choices[0].message.content;
}