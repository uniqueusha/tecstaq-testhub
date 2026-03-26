const express=require('express');
const bodyParser=require("body-parser");
const app=express();
const path = require("path");   
const helmet = require("helmet");
const cors = require('cors');


app.use(express.json({ limit: '100mb' }));  
app.use("/images", express.static(path.join(__dirname, "images")));
app.use(express.static('public')); // Assuming 'public' is the directory containing 'images'

app.use(cors())
//const userRoute = require('./src/routes/user.route');
const studentRoute = require('./src/routes/student-registration.route');

app.use(bodyParser.json());

app.use(helmet.hsts({ maxAge: 31536000, includeSubDomains: true, preload: true }));
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"], // blocks inline <script> and external scripts
      styleSrc: ["'self'", "'unsafe-inline'"], // allow CSS
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  })
);
// app.use((req, res, next) => {
//   const allowedHosts = [
//     "support.tecstaq.com",
//     "localhost"
//   ];

//   const requestHost = req.headers.host?.split(":")[0];
  
//   if (!allowedHosts.includes(requestHost)) {
//     return res.status(403).json({
//       status: 403,
//       message: "Forbidden: Direct IP access is not allowed"
//     });
//   }

//   next();
// });

// const allowedOrigins = [
//     "https://support.crm.tecstaq.com",
//     "http://localhost:4200"
// ];

// app.use((req, res, next) => {
//     const origin = req.headers.origin;

//     // Allow only whitelisted domains
//     if (allowedOrigins.includes(origin)) {
//         res.setHeader("Access-Control-Allow-Origin", origin);
//     } else {
//         return res.status(403).json({
//             status: 404,
//             message: "CORS Blocked: Origin not allowed"
//         });
//     }
//        res.setHeader("Access-Control-Allow-Credentials", "true");
//     res.setHeader(
//         "Access-Control-Allow-Headers",
//         "Origin, X-Requested-With, Content-Type, Accept, Authorization"
//     );
//     next();
// });
// app.disable('x-powered-by');

app.use((req,res,next)=>{
    res.setHeader("Access-Control-Allow-Origin","*");
    res.setHeader(
        "Access-Control-Allow-Headers",
        "Origin,X-Requested-With,Content-Type,Accept, Authorization"
    );
    res.setHeader(
        "Access-Control-Allow-Methods",
        "GET,POST,PATCH,PUT,DELETE,OPTIONS" 
    );
    next();
});

app.get('/health', async (req, res) => {
    res.json("Help Desk Server is running");
});

//app.use(require('./src/middleware/xss-protect'));


//app.use('/api/user', userRoute);
app.use('/api/student', studentRoute);


module.exports = app;