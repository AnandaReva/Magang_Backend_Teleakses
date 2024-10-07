const CryptoJS = require('crypto-js');

const session_secret = '0613bd95be23291bbe9b9945ce84524b0c47305c0c4624e35de3d84888c9f34f';

const apis = [
    //API 1
    {
        data: {
            row_length: 0,
            page: 0,
            sort_column: 0,
            direction: "desc",
            bot_id: "1"
        },
        from_date: 0,
        to_date: 0,
        search_filter: "string",
        date_mode: 0
    },
    //API 2
    {
        data: {
            bot_id: "1"
        },
        from_date: 0,
        to_date: 0,
        date_mode: 0
    },
    //API 3
    {
        data: {
            bot_id: "1"
        },
        from_date: 0,
        to_date: 0,
        search_filter: "string",
        date_mode: 0
    },
    //API 4
    {
        job_id: "1725331930-c25c0600518e422c8a6ce2ee51998089"
    },
    //API 5
    {
        bot_id: "1"
    },
    //API 6
    {
        bot_id: "1",
        child_prompt_id: "",
        knowledge_text: "",
        classification_name: ""
    },
    //API 7
    {
        bot_id: "1"
    },
    //API 8
    {
        bot_id: "1",
        greeting: "",
        topics: ""
    },
    //API 9
    {
        bot_id: "1"
    },
    // API 10
    {
        bot_id: "7",
        file: "cGhvbmUsbmFtYSx0YWdpaGFuLGphdHVodGVtcG8KMDgxMjM3NjE1MTU4LEpva28sNzUwMDAsOCBTZXB0ZW1iZXIgMjAyNAo=",
        filename: "test call salesbot telemarketing.csv"
    },
    // API 11
    {
        bot_id: "7"
    }

];

apis.forEach((parameters, index) => {
    const parameters_json = JSON.stringify(parameters);
    console.log(`--------------------\nAPI ${index + 1} Parameters:`, parameters);
    console.log(`Serialized API ${index + 1} Parameters:`, parameters_json);
    const hashed_body = generateHmac(parameters_json, session_secret, `API ${index + 1} Parameters`);
    console.log(`Hashed API ${index + 1} Body:`, hashed_body);
});

function generateHmac(message, key, notif) {
    console.log("Start hashing", notif, "!!");
    console.log("Key:", key);
    console.log("Message:", message);
    if (message && key) {
        const hmac = CryptoJS.HmacSHA256(message, key);
        const res = CryptoJS.enc.Base64.stringify(hmac);
        console.log(notif, ":", res);
        return res;
    } else {
        console.error("Message or key not provided.");
        return null;
    }
}