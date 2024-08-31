

const parameters = {
    data: {
        row_length: Number(rowLength.value),
        page: currentPage.value,
        sort_column: 0,
        direction: 'desc',
        bot_id: queryID.value,
    },
    from_date: Number(dateOfCustom.value.fromDate),
    to_date: Number(dateOfCustom.value.toDate),
    // search_filter: '',
    search_filter: tempFilter.value.topic,
    date_mode: Number(tempFilter.value.date),
};

console.log('param di initializeDataTable', parameters);
    parameters_json = JSON.srtingify (parameters)
    console.log("parameters_json = ",parameters_json)
    console.log("session_secret : ",session_secret)
    hashed_body = generateHmac(parameters_json, session_secret, "parameters_json");

    

function generateHmac(message, key, notif) {
    console.log("start hashing", notif, " !!");
    console.log("key:", key);
    console.log("message:", message);
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