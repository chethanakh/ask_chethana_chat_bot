const axios = require('axios');
const delay = (ms) => new Promise((res) => setTimeout(res, ms));
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

exports.createThreads = async () => {
    const response = await axios.post('https://api.openai.com/v1/threads', {}, {
        headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'assistants=v2'
        }
    });
    return response.data.id;
}

exports.askOnThreads = async (threadId, message, role = "user") => {
    const headers = {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
    }
    const response = await axios.post(`https://api.openai.com/v1/threads/${threadId}/messages`, {
        "role": role,
        "content": message
    }, {
        headers: headers
    });

    var createRun = await axios.post(`https://api.openai.com/v1/threads/${threadId}/runs`, {
        "assistant_id": "asst_Hwkx0Dc8G8ozHucZDdJhiJxK",
    },
        { headers: headers }
    )

    var status = createRun.data.status;
    var runId = createRun.data.id;
    console.log("Processing GPT job: " + status);

    while (status === "queued" || status === "in_progress") {
        delay(100);
        console.log("Processing GPT job: " + status);
        var run = await axios.get(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
            headers: headers
        })
        status = run.data.status
    }

    if (status === "completed") {
        var messageList = await axios.get(`https://api.openai.com/v1/threads/${threadId}/messages`, {
            headers: headers
        })
        var latestMsg = messageList.data.data[0]
        console.log("GPT process done.");

        return latestMsg.content[0].text.value;
    }
}

exports.call = async () => {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        // model: "gpt-3.5-turbo",
        messages: [{ role: "system", content: startSystemPrompt }]
    }, {
        headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
        }
    });
    return response.data.choices[0].message.content;
}