const { FintectureClient } = require('fintecture-client');
const app = require("express")();
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');
var bodyParser = require("body-parser"); 

app.set("view engine", "ejs"); 
app.set("views", __dirname + "/views/pis-connect");
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
        amount: 1,
        currency: "EUR",
        communication: "123",
        execution_date: '',
        customer_ip: '',
        customer_full_name: '',
        customer_email: '',
        customer_phone: '',
        customer_address_street: '',
        customer_address_number: '',
        customer_address_complement: '',
        customer_address_zip: '',
        customer_address_city: '',
        customer_address_country: '',
        production: process.env.FINTECTURE_ENV === "production"
    });
});

app.post("/connect", async (req, res) => {

    checkConnectParams(req.body);

    if(errors.length === 0){ 
        let connectConfig = {
            amount: req.body.amount,
            currency: req.body.currency,
            communication: req.body.communication,
            execution_date: req.body.execution_date || undefined,
            customer_full_name: req.body.customer_full_name || 'Bob Smith',
            customer_email: req.body.customer_email || 'bob.smith@gmail.com',
            customer_ip: req.body.customer_ip || '127.0.0.1',
            customer_phone: req.body.customer_phone || '',
            customer_address_street: req.body.customer_address_street || '',
            customer_address_number: req.body.customer_address_number || '',
            customer_address_complement: req.body.customer_address_complement || '',
            customer_address_zip: req.body.customer_address_zip || '',
            customer_address_city: req.body.customer_address_city || '',
            customer_address_country: req.body.customer_address_country || '',
            state: 'somestate',
            //redirect_uri: you can specify your own redirect_uri as long as it's defined in the console ; default redirect_uri is the one defined in the console
            //origin_uri: you can use any origin_uri (in case payeur abandons payment) ; default origin_uri is the last page he was on before redirecting to Connect
            psu_type: req.body.psu_type || 'retail',
            country: 'fr'
        };

        try {
            let accessToken = await client.getAccessToken();
            let connect = await client.getPisConnect(accessToken["access_token"], connectConfig);
            res.redirect(connect.url);
        }
        catch (err) {
            console.log("err", err)
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.write('<html><body>');
            res.write(err.response?JSON.stringify(err.response.data):'error');
            res.end('</html></body>');
        }
    } else {
        res.redirect('/');
    }
});

app.get("/callback", async (req, res) => {
    try {

        let accessToken = await client.getAccessToken();
        let payment = await client.getPayments(accessToken["access_token"], req.query.session_id);
        let verification = (payment.meta.status === req.query.status)
        //let deleteData = await client.deleteCustomer(accessToken["access_token"], req.query.customer_id);
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
    if (params.communication === null || params.communication === '') errors.push('Communication field is mandatory')
    if (Number(params.amount) === NaN) errors.push('Amount should be a number')
    if (Number(params.amount) <= 0) errors.push('Amount should be greater than 0')
}

app.listen(1237, () => console.log("Fintecture App listening on port 1237..."))