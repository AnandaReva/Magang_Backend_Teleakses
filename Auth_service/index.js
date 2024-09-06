const express = require('express')
const bodyParser = require('body-parser')
const Pool = require('pg').Pool

const app = express()
const port = 48000
const version = "0.0.1"

var DBUSER = process.env.DBUSER ? process.env.DBUSER : "servo";
var DBPASS = process.env.DBPASS ? process.env.DBPASS : "rahasia";
var DBHOST = process.env.DBHOST ? process.env.DBHOST : "localhost" ;
var DBPORT  = Number(process.env.DBPORT ? process.env.DBPORT : "5432") ;
var DBNAME  = process.env.DBNAME ? process.env.DBNAME : "servo" ;
var DBSCHEME  = process.env.DBSCHEME ? process.env.DBSCHEME : "public" ;
var challenge_timeout = Number(process.env.CHALLENGE_TIMEOUT ? process.env.CHALLENGE_TIMEOUT : "10") ;

const pool = new Pool({
  user: DBUSER,
  host: DBHOST,
  database: DBNAME,
  password: DBPASS,
  port: DBPORT,
})

const auth_util = require('./auth_utils')


function mylog(request_id,text,param) {
  // CUSTOM LOGGING
  let date3 = new Date()
  let timestamp = date3.toISOString()
  if (param == null || typeof param == 'undefined') {
    console.log(`${timestamp} - version:${version} - ${request_id} - ${text}`)
  } else {
    console.log(`${timestamp} - version:${version} - ${request_id} - ${text}`,param)
  }
}

app.get('/', (req, res) => {
  // GREETING
  let date3 = new Date()
  let r_id = auth_util.generate_noce(16)
  mylog(rid,"hello world request received...")
  let result = {
    timestamp: date3.toISOString(),
    nonce: r_id,
    message:'Hello!',
    version: version
  }
  let jres = JSON.stringify(result)
  res.setHeader('Content-Type', 'application/json');
  res.status(200).send(jres);
})

app.use(bodyParser.raw({type:"*/*"}))

function validate_json_payload(request_id,jdata,mandatory_fields) {
  let result = {}
  let status_code = 200
  let request_data = {}
  try {
    request_data = JSON.parse(jdata)
    mandatory_fields.forEach(element => {
      if (!request_data[element]) {
        mylog(request_id,`!!! INVALID REQUEST: missing field - [${element}]`)
        result = {
          error_message:"invalid request. Missing mandatory field(s)",
          error_code:"40000003",
        }
        status_code = 400
      }
      else {
        mylog(request_id,`request - [${element}] = ${request_data[element]}`)
      }
    });
  }
  catch (e) {
    error_str = `!!! EXCEPTION: ${e.name}: ${e.message}`
    mylog(request_id,error_str)
    result = {
      error_message:"invalid request. Invalid JSON",
      error_code:"40000002",
    }
    status_code = 400
  }
  let ret = {
    "status_code": status_code,
    "result": result
  }
  if (status_code == 200) {
    ret["result"] = request_data
  }
  return ret
}

app.post('/start', async (req, res) => {
  const curr_time = Math.floor(Date.now()/1000);
  const curr_time_str = auth_util.integerToBase36(curr_time)
  const nonce = auth_util.generate_noce(8)
  const r_id = curr_time_str +"."+ nonce
  mylog(r_id,"request to /start received...")

  let content_type = req.headers['content-type']
  mylog(r_id,`request content-type: [${content_type}]`)

  let status_code = 200
  let result = {
    message:"hello",
  }
  
  // VALIDATE content-type
  if (content_type !== 'application/json') {
    mylog(request_id,"!!! INVALID REQUEST: Not JSON")
    result = {
      error_message:"invalid request. Not JSON",
      error_code:"40000001",
    }
    status_code = 400
  }
  else {
    // VALIDATE POST BODY
    let jdata = req.body.toString().trim()
    mylog(r_id,`request body: ${jdata}`)

    let mandatory_fields = ["username","half_nonce"]
    let ret = validate_json_payload(r_id,jdata,mandatory_fields)
    status_code = ret.status_code
    result = ret.result
  }

  if (status_code === 200) {
    let request_data = result
    let half_nonce = request_data.half_nonce.trim()
    let username = request_data.username.trim()

    //VALIDATE FIELDS
    if (half_nonce.length != 8) {
      mylog(r_id,`!!! INVALID REQUEST: incorrect half_nonce length`)
      result = {
        error_message:"invalid request. invalid field value",
        error_code:"40000004",
      }
      status_code = 400
    }
    else {
      //GENERATE FULLNONCE
      const full_nonce = half_nonce+nonce
      mylog("full_nonce: ",full_nonce)

      //TODO: AMBIL SALT DAN USER ID BERDASARKAN USERNAME
      let salt = ""
      let user_id = false
      const sql = "SELECT user_id,salt FROM servouser.user WHERE username=$1 LIMIT 1"
      try {
        const res = await pool.query(sql,[username])
        row = res.rows[0]
        user_id = row["user_id"]
        salt = row["salt"]
      } catch (error) {
        mylog("ERROR: GAGAL AMBIL DATA USER")
      }
      mylog(`user id: ${user_id} salt:${salt}`)
      if (! user_id) {
        result = {
          full_nonce:full_nonce,
          salt:auth_util.generate_noce(16),
        } 
      }
      else {
        //SUSUN RESPONSE
        result = {
          full_nonce: full_nonce,
          salt: salt
        }
        //TODO: SIMPAN KE TABLE CHALLENGE RESPONSE
        const sql = "INSERT INTO servouser.challenge_response(full_nonce,iser_id) VALUES($1,$2) RETURNING *"
        try {
          const res = await pool.query(sql,[full_nonce,user_id])          
        } catch (error) {
          mylog("ERROR: GAGAL INSERT KE challenge_response")
        }

      }

    }
  }
  let jres = JSON.stringify(result)
  mylog(r_id,`sending response: ${jres}`)
  res.setHeader('Content-Type', 'application/json');
  res.status(status_code).send(jres);
})


app.post('/fin', async (req, res) => {
  const curr_time = Math.floor(Date.now()/1000);
  const curr_time_str = auth_util.integerToBase36(curr_time)
  const nonce = auth_util.generate_noce(8)
  const r_id = curr_time_str +"."+ nonce
  mylog(r_id,"request to /fin received...")

  let content_type = req.headers['content-type']
  mylog(r_id,`request content-type: [${content_type}]`)

  let status_code = 200
  let result = {
    message:"hello",
  }
  
  // VALIDATE content-type
  if (content_type !== 'application/json') {
    mylog(request_id,"!!! INVALID REQUEST: Not JSON")
    result = {
      error_message:"invalid request. Not JSON",
      error_code:"40000001",
    }
    status_code = 400
  }
  else {
    // VALIDATE POST BODY
    let jdata = req.body.toString().trim()
    mylog(r_id,`request body: ${jdata}`)

    let mandatory_fields = ["full_nonce","challenge_response"]
    let ret = validate_json_payload(r_id,jdata,mandatory_fields)
    status_code = ret.status_code
    result = ret.result
  }
  if (status_code === 200) {
    let request_data = result
    let full_nonce = request_data.full_nonce.trim()
    mylog(r_id,`full_nonce : ${full_nonce}`)
    let rchallenge_response = request_data.challenge_response.trim()
    mylog(r_id,`receied challenge_response: ${rchallenge_response}`)

    //VALIDATE FIELDS
    if (full_nonce.length != 16) {
      mylog(r_id,`!!! INVALID REQUEST: incorrect full_nonce length`)
      result = {
        error_message:"invalid request. invalid field value",
        error_code:"40000004",
      }
      status_code = 400
    }
    else {
      //GET CHALLENGE DATA FROM DB
      const user_id = 1
      const salt = "12345"
      const password = "rahasia"
      const salted_password = auth_util.HMAC_SHA256_hash_hex(salt,password)


      //CALCULATE CHALLENGE RESPONSE
      const cchallenge_response = auth_util.HMAC_SHA256_hash_base64(full_nonce,salted_password)

      //COMPARE received CHALLENGE RESPONSE AND calculated CHALLENGE RESPONSE
      if (rchallenge_response === cchallenge_response) {
        //GENERATE SESSION ID AND NONCE2
        const session_id = auth_util.generate_noce(16)
        const nonce2 = nonce
        result = {
          session_id: session_id,
          nonce2: nonce2
        }
  
        //SIMPAN KE TABLE SESSION
      } else {
        status_code = 401
        result = {
          error_message: "unauthenticated",
          error_code: "40100001"
        }
      }
    }
  }
  let jres = JSON.stringify(result)
  mylog(r_id,`sending response: ${jres}`)
  res.setHeader('Content-Type', 'application/json');
  res.status(status_code).send(jres);
})

app.listen(port, () => {
  console.log(`auth app listening on port ${port}`)
})