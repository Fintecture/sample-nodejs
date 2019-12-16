const { FintectureClient } = require('fintecture-client');
const app = require("express")();
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');
var bodyParser = require("body-parser"); 

app.set("view engine", "ejs"); 
app.set("views", __dirname + "/views/connect");
app.use(bodyParser.urlencoded({ extended: false })); 

dotenv.config({ path: path.join(__dirname, '.env') });

require('dotenv').config();

// Create the fintecture client instance
let client = new FintectureClient({ app_id: process.env.APP_ID, app_secret: process.env.APP_SECRET, private_key: process.env.APP_PRIV_KEY, env: process.env.FINTECTURE_ENV });

let errors = [];

// Construct a provider selector pane
app.get("/", async (_req, res) => {
    res.render("index", {
        errors: errors,
        amount: 150,
        currency: "EUR",
        order_id: "123",
        customer_id: '',
        customer_ip: '',
        customer_full_name: '',
        customer_email: '',
        production: process.env.FINTECTURE_ENV === "production"
    });
});

app.post("/connect", async (req, res) => {
    checkConnectParams(req.body);

    if(errors.length === 0){ 
        let connectConfig = {
            amount: req.body.amount,
            currency: req.body.currency,
            communication: req.body.order_id,
            customer_id: req.body.customer_id || '9',
            customer_full_name: req.body.customer_full_name || 'Bob Smith',
            customer_email: req.body.customer_email || 'bob.smith@gmail.com',
            customer_ip: req.body.customer_ip || '127.0.0.1',
            redirect_uri: process.env.APP_REDIRECT_URI,
            origin_uri: process.env.APP_REDIRECT_URI.replace('/callback','')
        };
    
        try {
            let accessToken = await client.getAccessToken();
            let url = await client.getPisConnectUrl(accessToken["access_token"], connectConfig);
            res.redirect(url);
    
        }
        catch (err) {
            res.write(err.response?JSON.stringify(err.response.data):'error');
        }
    } else {
        res.redirect('/');
    }
});

app.get("/callback", async (req, res) => {
    try {
        let verification = await client.verifyConnectUrlParameters({
            session_id: req.query.session_id,
            status: req.query.status,
            customer_id: req.query.customer_id,
            provider: req.query.provider,
            state: req.query.state,
            s: req.query.s
        });

        res.render("callback", {
            status: req.query.status,
            verified: verification
        });
    }
    catch (err) {
        res.write(err.response?JSON.stringify(err.response.data):'error');
    }
});

function checkConnectParams(params) {
    errors = [];
    if (params.amount === null) errors.push('Amount field is mandatory')
    if (params.currency === null || params.currency === '') errors.push('Currency field is mandatory')
    if (params.order_id === null || params.order_id === '') errors.push('Order ID field is mandatory')
    if (Number(params.amount) === NaN) errors.push('Amount should be a number')
    if (Number(params.amount) <= 0) errors.push('Amount should be greater than 0')
}

app.listen(1234, () => console.log("Fintecture App listening on port 1234..."))