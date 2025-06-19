// amazon.js
const axios = require('axios');

async function getAmazonAccessToken() {
  const url = 'https://api.amazon.com/auth/o2/token';
  const params = new URLSearchParams();
  params.append('grant_type', 'refresh_token');
  params.append('refresh_token', process.env.AMAZON_REFRESH_TOKEN);
  params.append('client_id', process.env.AMAZON_CLIENT_ID);
  params.append('client_secret', process.env.AMAZON_CLIENT_SECRET);

  try {
    const response = await axios.post(url, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response.data.access_token;
  } catch (error) {
    console.error('Failed to get Amazon access token:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = { getAmazonAccessToken };
