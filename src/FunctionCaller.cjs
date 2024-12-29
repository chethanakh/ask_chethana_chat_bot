const functions = {
    get_projects_by_programming_language: async ({ langvage }) => {
        return "Most latest open source projects is `ask chethana chat bot` that created with Open AI and node js."
    }
}

exports.call = async (functionName, prams) => {
    console.log("Calling..:" + functionName);

    if (typeof functions[functionName] === 'function') {
        return await functions[functionName](prams);
    } else {
        throw new Error(`Function "${functionName}" not found.`);
    }
}

