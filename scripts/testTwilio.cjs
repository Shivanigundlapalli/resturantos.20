require('dotenv').config();
const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

if (!accountSid || !authToken) {
  console.error("Missing Twilio credentials in .env");
  process.exit(1);
}

const client = twilio(accountSid, authToken);

console.log("Testing Twilio connection for SID:", accountSid);

client.api.accounts(accountSid).fetch()
  .then(account => {
    console.log("✅ Twilio is successfully connected!");
    console.log("Account Name:", account.friendlyName);
    console.log("Status:", account.status);
    console.log("Type:", account.type);
    
    // Also fetch available phone numbers to verify they own the one in .env
    return client.incomingPhoneNumbers.list({limit: 5});
  })
  .then(numbers => {
    if (numbers && numbers.length > 0) {
      console.log("\nAssociated Phone Numbers:");
      numbers.forEach(n => console.log("- " + n.phoneNumber));
    } else {
      console.log("\nNo phone numbers found associated with this account.");
    }
  })
  .catch(err => {
    console.error("❌ Twilio Error:", err.message);
  });
