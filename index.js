// Import required modules
const express = require("express"); // Express framework for handling HTTP requests
const bodyParser = require("body-parser"); // Middleware for parsing request bodies
const crypto = require("crypto"); // Node.js crypto module for encryption and decryption
const _sodium = require("libsodium-wrappers");

const port = 80; // Port on which the server will listen
const ENCRYPTION_PRIVATE_KEY =
  "MC4CAQAwBQYDK2VuBCIEICA0tRk500RaSl6R5Op30t+9QQZF6xz014aNOWgu2p9W";
const ONDC_PUBLIC_KEY =
  "MCowBQYDK2VuAyEAa9Wbpvd9SsrpOZFcynyt/TO3x0Yrqyys4NUGIvyxX2Q=";
const REQUEST_ID = "1e2effe1-70c5-435a-9f36-a8edfd4c8bba";
const SIGNING_PRIVATE_KEY =
  "0dbaBvbguApfPDOcmtPYfrHQ5sm1C+VKOeJhfTMWlZWkAowsvTnwZ38rZ11diqkua9HzOHt+kZdZFf1bmGJ/fw==";

const htmlFile = `
<!--Contents of ondc-site-verification.html. -->
<!--Please replace SIGNED_UNIQUE_REQ_ID with an actual value-->
<html>
  <head>
    <meta
      name="ondc-site-verification"
      content="SIGNED_UNIQUE_REQ_ID"
    />
  </head>
  <body>
    ONDC Site Verification Page
  </body>
</html>
`;
// Pre-defined public and private keys
const privateKey = crypto.createPrivateKey({
  key: Buffer.from(ENCRYPTION_PRIVATE_KEY, "base64"), // Decode private key from base64
  format: "der", // Specify the key format as DER
  type: "pkcs8", // Specify the key type as PKCS#8
});
const publicKey = crypto.createPublicKey({
  key: Buffer.from(ONDC_PUBLIC_KEY, "base64"), // Decode public key from base64
  format: "der", // Specify the key format as DER
  type: "spki", // Specify the key type as SubjectPublicKeyInfo (SPKI)
});

// Calculate the shared secret key using Diffie-Hellman
const sharedKey = crypto.diffieHellman({
  privateKey: privateKey,
  publicKey: publicKey,
});

// Create an Express application
const app = express();
app.use(bodyParser.json()); // Middleware to parse JSON request bodies

// Route for handling subscription requests
app.post("/ondc/v1/on_subscribe", function (req, res) {
  const { challenge } = req.body;

  console.log("challenge", challenge); // Extract the 'challenge' property from the request body
  const answer = decryptAES256ECB(sharedKey, challenge);
  console.log("answer", answer);
  console.log("sharedKey", sharedKey);
  console.log("challenge", challenge);
  // Decrypt the challenge using AES-256-ECB
  const resp = { answer: answer };
  res.status(200).json(resp); // Send a JSON response with the answer
});

// Route for serving a verification file
app.get("/ondc-site-verification.html", async (req, res) => {
  const signedContent = await signMessage(REQUEST_ID, SIGNING_PRIVATE_KEY);
  // Replace the placeholder with the actual value
  const modifiedHTML = htmlFile.replace(/SIGNED_UNIQUE_REQ_ID/g, signedContent);
  // Send the modified HTML as the response
  res.send(modifiedHTML);
});

// Default route
app.get("/", (req, res) => res.send("Hello World!"));

// Health check route
app.get("/health", (req, res) => res.send("Health OK!!"));

app.listen(port, () => console.log(`ONDC app listening on port ${port}!`));

// Decrypt using AES-256-ECB
function decryptAES256ECB(key, encrypted) {
  const iv = Buffer.alloc(0); // ECB doesn't use IV
  const decipher = crypto.createDecipheriv("aes-256-ecb", key, iv);
  let decrypted = decipher.update(encrypted, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

async function signMessage(signingString, privateKey) {
  await _sodium.ready;
  const sodium = _sodium;
  const signedMessage = sodium.crypto_sign_detached(
    signingString,
    sodium.from_base64(privateKey, _sodium.base64_variants.ORIGINAL)
  );
  const signature = sodium.to_base64(
    signedMessage,
    _sodium.base64_variants.ORIGINAL
  );
  return signature;
}
