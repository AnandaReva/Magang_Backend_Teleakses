import { HmacSHA256, enc } from 'crypto-js';


const rowLength = { value: 1 };
const currentPage = { value: 1 };
const queryID = { value: '12345' };
const dateOfCustom = { value: { fromDate: '1680355200000', toDate: '1682947200000' } };
const tempFilter = { value: { topic: 'example_topic', date: '1' } };
const session_secret = 'gOFhhf39yBnWdtBVZc2LAsHnFonLFUaFD92CUhonvrg=';

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
    search_filter: tempFilter.value.topic,
    date_mode: Number(tempFilter.value.date),
};

console.log('param di initializeDataTable', parameters);
const parameters_json = JSON.stringify(parameters);
console.log("parameters_json = ", parameters_json);
console.log("session_secret : ", session_secret);

const hashed_body = generateHmac(parameters_json, session_secret, "parameters_json");

function generateHmac(message, key, notif) {
    console.log("start hashing", notif, " !!");
    console.log("key:", key);
    console.log("message:", message);
    if (message && key) {
        const hmac = HmacSHA256(message, key);
        const res = enc.Base64.stringify(hmac);
        console.log(notif, ":", res);
        return res;
    } else {
        console.error("Message or key not provided.");
        return null;
    }
}


console.log("Hashed Body: ", hashed_body);
