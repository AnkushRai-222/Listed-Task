 const express = require('express');
const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
require("dotenv").config()
// Create a new Express application.
const app = express();
const OAuth2 = google.auth.OAuth2;

// Create a Gmail service object.
const oauth2Client = new OAuth2Client({
    clientId: process.env.clientId,
    clientSecret: process.env.clientSecret,
    redirectUri: process.env.redirectUri
});

// Get the authorization URL for the 'Gmail' scope.
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/gmail.modify']
});

// Redirect user to the authorization URL to login with Google and authorize the app.
app.get('/login', (req, res) => {
  res.redirect(authUrl);
});


// Callback route to handle the authorization code and obtain access token.
app.get('/callback', async (req, res) => {
  const code = req.query.code;
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    console.log('Access token:', tokens.access_token);
    // Start checking for new emails.
    startCheckingEmails();
    res.send('Authorization successful. You can close this window now.');
  } catch (err) {
    console.error('Error obtaining access token:', err);
    res.send('Authorization failed. Please try again.');
  }
});
const getRandomInterval = () => {
  return Math.floor(Math.random() * (120000 - 45000 + 1)) + 45000; // Random interval between 45 and 120 seconds
};
const createMessage = ({ to, subject, body }) => {
  const messageParts = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(body).toString('base64')
  ];

  return messageParts.join('\n');
};
// Function to start checking for new emails.
const startCheckingEmails = async () => {
  try {
  setInterval(async () => {
    try {
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      const res = await gmail.users.messages.list({
        userId: 'me',
        q: 'is:unread'
      });

      const messages = res.data.messages;

      for (const message of messages) {
        const msg = await gmail.users.messages.get({
          userId: 'me',
          id: message.id
        });

        const threadId = msg.data.threadId;

        const thread = await gmail.users.threads.get({
          userId: 'me',
          id: threadId
        });

        const messages = thread.data.messages;
        const numOfReplies = messages.length - 1; // Subtract 1 to exclude the original email

        // If the email has no prior replies, send a reply.
        if (numOfReplies === 0) {
          const toHeader = msg.data.payload.headers.find(header => header.name === 'beastnuclearpubg@gmail.com');
          const to = toHeader ? toHeader.value : null;
          
          const subjectHeader = msg.data.payload.headers.find(header => header.name === 'Testing');
          const subject = subjectHeader ? subjectHeader.value : null;
          
          const reply = {
            to: to,
            subject: subject,
            body: 'Hi there,\n\nI\'m currently on vacation and will be back on [date]. I\'ll get back to you as soon as I can.\n\nThanks,\n[Your name]'
          };
          await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
              threadId: threadId,
              raw: createMessage(reply)
            }

          });
        }

        // Add a label to the email.
        const label = 'vacation';
        await gmail.users.labels.create({
          userId: 'me',
          requestBody: {
            label: { name: label }
          }
        });

        await gmail.users.messages.modify({
          userId: 'me',
          id: message.id,
          requestBody: {
            addLabelIds: [label]
          }
        });
      }
    } catch (err) {
      console.error('Error checking for new emails:', err);
    }
  }, getRandomInterval());
}catch (err) {
  console.error('Error checking for new emails:', err);
  console.log('Error response data:', err.response.data);
  console.log('Error response status:', err.response.status);
  console.log('Error response headers:', err.response.headers);
}
};

// Start the server.
app.listen(3000, () => {
    console.log('App listening on port 3000');
  });
 
