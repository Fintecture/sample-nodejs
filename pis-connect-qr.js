const { FintectureClient } = require('fintecture-client');
const app = require("express")();
const path = require('path');
const dotenv = require('dotenv');
const qrcode = require('qrcode');
var bodyParser = require("body-parser"); 

app.set("view engine", "ejs"); 
app.set("views", __dirname + "/views/pis-connect-qr");
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
        communication: "123",
        customer_ip: '',
        customer_full_name: '',
        customer_email: '',
        production: process.env.FINTECTURE_ENV === "production"
    });
});

app.get("/qr", async (req, res) => {
    let fullUrl = req.protocol + '://' + req.headers['x-forwarded-host'] + '/connect?' + req.url.split('?')[1];
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.write('<html><body>');
    const b64img = await qrcode.toDataURL(fullUrl);
    res.write('<img src="' + b64img + '" alt="QR" />');
    res.end('</html></body>');
})

app.get("/connect", async (req, res) => {

    checkConnectParams(req.query);

    if(errors.length === 0){ 
        let connectConfig = {
            amount: Number(req.query.amount),
            currency: req.query.currency,
            communication: req.query.communication,
            customer_full_name: 'QR CODE',
            customer_email: 'noreply@fintecture.com',
            customer_ip: req.headers['x-forwarded-for'] || '127.0.0.1',
            redirect_uri: process.env.APP_REDIRECT_URI,
            origin_uri: process.env.APP_REDIRECT_URI.replace('/callback',''),
            psu_type: req.query.psu_type || 'retail',
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

app.listen(1238, () => console.log("Fintecture App listening on port 1238..."))