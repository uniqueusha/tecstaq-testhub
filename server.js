const app = require("./app");
const debug = require("debug")("backend");
const https = require("http");
const path = require('path');
const fs = require("fs");


/* ?? SSL FILE PATHS */
const SSL_KEY_PATH = path.join(__dirname, "ssl/keys/tecstaq.rsa.key");
const SSL_CERT_PATH = path.join(__dirname, "ssl/certs/_tecstaq_com.crt");

const sslOptions = {
  key: fs.readFileSync(SSL_KEY_PATH),
  cert: fs.readFileSync(SSL_CERT_PATH),
};


const normalizePort = val => {
  const port = parseInt(val, 10);

  if (isNaN(port)) {
    // Named pipe
    return val;
  }

  if (port >= 0) {
    // Port number
    return port;
  }

  return false;
};

const onError = error => {
  if (error.syscall !== "listen") {
    throw error;
  }

  const bind = typeof port === "string" ? "pipe " + port : "port " + port;

  switch (error.code) {
    case "EACCES":
      console.error(bind + " requires elevated privileges");
      process.exit(1);
      break;
    case "EADDRINUSE":
      console.error(bind + " is already in use");
      process.exit(1);
      break;
    default:
      throw error;
  }
};

const onListening = () => {
  const addr = server.address();
  const bind = typeof addr === "string" ? "pipe " + addr : "port " + addr.port;
  debug("Listening on " + bind);
};

const port = normalizePort(process.env.PORT || "3000");
/* ? HTTPS SERVER */
const server = https.createServer(sslOptions, app);
app.set("port", port);

// const server = http.createServer(app);
server.on("error", onError);
server.on("listening", onListening);


server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
  