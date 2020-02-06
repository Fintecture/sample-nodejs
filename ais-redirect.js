const { FintectureClient } = require('fintecture-client');
const app = require("express")();
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env') });

require('dotenv').config();

// Create the fintecture client instance
let client = new FintectureClient({ app_id: process.env.APP_ID, app_secret: process.env.APP_SECRET, private_key: process.env.APP_PRIV_KEY, env: process.env.FINTECTURE_ENV });

// Define accessToken and CustomerID global variables
let accessToken;
let customerId;

// Construct a provider selector pane
app.get("/", async (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.write('<html><body>');

    try {
        // Get list of available banks
        let countryFilter = req.query.country || 'FR';
        let psuType = req.query.psu_type || 'retail';
        let options = { 'filter[ais]': 'accounts', 'filter[country]': countryFilter, 'filter[psu_type]': psuType, 'filter[auth_model]': 'redirect', 'sort[full_name]': 'asc' }
        let providers = await client.getProviders(options);
        res.write(_prettyDisplayProviders(providers));
    }
    catch (err) {
        res.write(err.response ? JSON.stringify(err.response.data) : 'error getting providers');
    }

    res.end('</html></body>');
});

app.get("/provider/:provider", async (req, res) => {

    try {
        // Authenticate to a bank for AIS connections
        let providerAuth = await client.getRedirectAuthUrl(null, req.params.provider, process.env.APP_REDIRECT_URI);
        res.redirect(providerAuth.url);
    }
    catch (err) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.write('<html><body>');
        res.write(err.response ? JSON.stringify(err.response.data) : 'error');
        res.end('</html></body>');
    }
});

// Get 'code' querystring parameter and hit data api
app.get("/callback", async (req, res) => {
    const code = req.query.code || 'unknown';
    customerId = req.query.customer_id;

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.write('</html></body>');

    try {
        // get the Fintecture access token to request the AIS APIs
        const tokens = await client.getAccessToken(code);
        accessToken = tokens.access_token;

        // get the Account details from the PSU
        const accounts = await client.getAccounts(accessToken, customerId);
        res.write(_prettyDisplayAccounts(accounts));
    }
    catch (err) {
        res.write(err.response ? JSON.stringify(err.response.data) : 'error')
    }
    
    res.write('</html></body>');
    res.end();
});

app.get("/transactions/:account", async (req, res) => {
    const account = req.params.account;

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.write('</html></body>');

    try {
        // get the Transaction details from the PSU
        const transactions = await client.getTransactions(accessToken, customerId, account);
        res.write(_prettyDisplayTransactions(transactions));
    }
    catch (err) {
        res.write(err.response ? JSON.stringify(err.response.data) : 'error')
    }
    res.end('</html></body>');
});

var _prettyDisplayProviders = function (providers) {
    let list = '';
    providers.data.forEach(provider => {
        list = list + '<a href="/provider/' + provider.id + '">' + provider.attributes.full_name + '</a><br>';
    });
    return list;
}

var _prettyDisplayAccounts = function (accounts) {
    let headers = '<tr><th>account_id</th><th>IBAN</th><th>Name</th><th>balance</th><th>currency</th></tr>'
    let rows = '';
    accounts.data.forEach(account => {
        rows = rows + '<tr><td><a href="../transactions/' + account.id + '">' + account.attributes.account_id + '</a></td><td>' + account.attributes.iban + '</td><td>' + account.attributes.account_name + '</td><td>' + account.attributes.balance + '</td><td>' + account.attributes.currency + '</td><tr>';
    });
    return '<table style="border:1px black;padding: 10px;">' + headers + rows + '</table>';
};

var _prettyDisplayTransactions = function (transactions) {
    let headers = '<tr><th>date</th><th>communication</th><th>amount</th><th>currency</th></tr>'
    let rows = '';
    transactions.data.forEach(txn => {
        rows = rows + '<tr><td>' + txn.attributes.booking_date + '</td><td>' + txn.attributes.communication + '</td><td>' + txn.attributes.amount + '</td><td>' + txn.attributes.currency + '</td><tr>';
    });
    return '<table style="border:1px black;padding: 10px;">' + headers + rows + '</table>';
}

app.listen(1234, () => console.log("Fintecture App listening on port 1234..."))