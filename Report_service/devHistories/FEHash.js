const CryptoJS = require('crypto-js');


//const session_secret = 'gOFhhf39yBnWdtBVZc2LAsHnFonLFUaFD92CUhonvrg='; 
const session_secret = '3VPRIYn6Zy9CMKwlTrY0fFux8bkzLMxdf3Om8c3lwBA='; 
//api 1
const parameters = {
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
};

//api 2
// const parameters = {

//     data: {
//         bot_id: "59"
//     },
//     from_date: 0,
//     to_date: 0,
//     date_mode: 0

// };

//api3
// const parameters = {
//     data: {
//         bot_id: "string"
//     },
//     from_date: 0,
//     to_date: 0,
//     search_filter: "string",
//     date_mode: 0
// };



console.log('Parameters:', parameters);


const parameters_json = JSON.stringify(parameters);
console.log("Serialized Parameters:", parameters_json);
console.log("Session Secret:", session_secret);


const hashed_body = generateHmac(parameters_json, session_secret, "parameters_json");


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




console.log("Hashed Body:", hashed_body);
