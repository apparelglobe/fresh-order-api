const axios = require('axios');
const aws4 = require('aws4');
const url = require('url');

let cachedToken = null;
let tokenExpiry = 0; // timestamp in ms

async function getAmazonAccessToken() {
  const now = Date.now();

  if (cachedToken && now < tokenExpiry) {
    return cachedToken;
  }

  const tokenUrl = 'https://api.amazon.com/auth/o2/token';
  const params = new URLSearchParams();
  params.append('grant_type', 'refresh_token');
  params.append('refresh_token', process.env.AMAZON_REFRESH_TOKEN);
  params.append('client_id', process.env.AMAZON_CLIENT_ID);
  params.append('client_secret', process.env.AMAZON_CLIENT_SECRET);

  try {
    const response = await axios.post(tokenUrl, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    cachedToken = response.data.access_token;
    tokenExpiry = now + (response.data.expires_in - 300) * 1000; // refresh 5 mins early
    console.log('Amazon access token fetched successfully.');
    return cachedToken;
  } catch (error) {
    console.error('Failed to get Amazon access token:', error.response?.data || error.message);
    throw error;
  }
}

async function getAmazonOrders(nextToken = null) {
  const accessToken = await getAmazonAccessToken();

  const endpoint = 'sellingpartnerapi-na.amazon.com';
  const path = '/orders/v0/orders';

  const queryParams = new URLSearchParams();
  queryParams.append('MarketplaceIds', process.env.AMAZON_MARKETPLACE_ID);
  queryParams.append('CreatedAfter', new Date(Date.now() - 30*24*60*60*1000).toISOString()); // last 30 days
  if (nextToken) queryParams.append('NextToken', nextToken);

  const requestUrl = `https://${endpoint}${path}?${queryParams.toString()}`;
  const { hostname, pathname, search } = url.parse(requestUrl);

  // Prepare the request for signing
  const opts = {
    host: hostname,
    path: pathname + search,
    service: 'execute-api',
    region: process.env.AMAZON_REGION,
    method: 'GET',
    headers: {
      'x-amz-access-token': accessToken,
      'host': hostname,
      'Content-Type': 'application/json',
    }
  };

  // Sign the request with AWS Signature V4
  aws4.sign(opts, {
    accessKeyId: process.env.AMAZON_AWS_ACCESS_KEY,
    secretAccessKey: process.env.AMAZON_AWS_SECRET_KEY,
  });

  try {
    const response = await axios.get(`https://${opts.host}${opts.path}`, {
      headers: opts.headers,
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching Amazon orders:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = {
  getAmazonAccessToken,
  getAmazonOrders,
};
