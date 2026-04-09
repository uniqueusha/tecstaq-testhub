const pool = require("../../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
//const xlsx = require("xlsx");
const fs = require("fs");
const path = require('path');

const transporter = nodemailer.createTransport({
    host: "smtp-mail.outlook.com",
    port: 587,
    secure: false,
    auth: {
        user: "support@tecstaq.com",
        pass: "HelpMe@1212#$",
    },
    tls: {
        rejectUnauthorized: false,
    },
 });

// Function to obtain a database connection
const getConnection = async () => {
  try {
    const connection = await pool.getConnection();
    return connection;
  } catch (error) {
    throw new Error("Failed to obtain database connection: " + error.message);
  }
};

//error handle 422...
error422 = (message, res) => {
  return res.status(422).json({
    status: 422,
    message: message,
  });
};

//error handle 500...
error500 = (error, res) => {
  return res.status(500).json({
    status: 500,
    message: "Internal Server Error",
    error: error,
  });
};

//error 404 handler...
error404 = (message, res) => {
  return res.status(404).json({
    status: 404,
    message: message,
  });
};

//create user
const createUser = async (req, res) => {
  const user_name = req.body.user_name ? req.body.user_name.trim() : "";
  const email_id = req.body.email_id ? req.body.email_id.trim() : "";
  const mobile_number = req.body.mobile_number ? req.body.mobile_number : '';
  const role = req.body.role ? req.body.role.trim() : "";
  const password = "123456";

  if (!user_name) {
    return error422("User name is required.", res);
  } else if (!email_id) {
    return error422("Email id is required.", res);
  } else if (!mobile_number) {
    return error422("Phone number is required.", res);
  } else if (!password) {
    return error422("Password is required.", res);
  } else if (!role) {
    return error422("Role is required.", res);
  }

    // //check User Name already is exists or not
    // const isExistUserNameQuery = `SELECT * FROM users WHERE LOWER(TRIM(user_name))= ?`;
    // const isExistUserNameResult = await pool.query(isExistUserNameQuery, [user_name.toLowerCase()]);
    // if (isExistUserNameResult[0].length > 0) {
    //     return error422(" User Name is already exists.", res);
    // }

    // // Check if email_id exists
    // const checkUserQuery = "SELECT * FROM users WHERE LOWER(TRIM(email_id)) = ? AND status = 1";
    // const checkUserResult = await pool.query(checkUserQuery, [email_id.toLowerCase()]);
    // if (checkUserResult[0].length > 0) {
    //     return error422('Email id is already exists.', res);
    // }
    
    // Attempt to obtain a database connection
    let connection = await getConnection();
    try {
        //Start the transaction
        await connection.beginTransaction();
        //insert into user
        const insertUserQuery = `INSERT INTO users (user_name, email_id, mobile_number, role ) VALUES (?, ?, ?, ?)`;
        const insertUserValues = [ user_name, email_id, mobile_number, role];
        const insertuserResult = await connection.query(insertUserQuery, insertUserValues);
        const user_id = insertuserResult[0].insertId;
        
        const hash = await bcrypt.hash(password, 10); // Hash the password using bcrypt

        //insert into Untitled
        const insertUntitledQuery =
        "INSERT INTO untitled (user_id, extenstions) VALUES (?,?)";
        const insertUntitledValues = [user_id, hash];
        const untitledResult = await connection.query(insertUntitledQuery, insertUntitledValues)

        
        const message = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Welcome to test</title>
          <style>
              div{
              font-family: Arial, sans-serif; 
               margin: 0px;
                padding: 0px;
                color:black;
              }
          </style>
        </head>
        <body>
        <div>
        <h2 style="text-transform: capitalize;">Hi ${user_name},</h2>
        <h3>Welcome to Tecstaq!</h3>

        <p>Your account has been successfully created. Here are your login details:</p>
        <p>Email: ${email_id}</p>
        <p>Temporary Password: ${password}</P>
        <p>You can log in using the following link:
          <a href="https://tecstaq.testhub.com/">https://tecstaq.testhub.com/</a></p>
          <p>For security reasons, please change your password after your first login.</p>
          <p>If you didn’t request this account or believe this was created in error, please contact our support team at support@tecstaq.com.</p>
          <p>Thank you,</p>
          <p><strong>Tecstaq Testhub</strong></p>

        </div>
        </body>
        </html>`;
        // Prepare the email message options.
        const mailOptions = {
            from: "support@tecstaq.com", // Sender address from environment variables.
            to: `${email_id}`, // Recipient's name and email address."sushantsjamdade@gmail.com",
            // bcc: ["sushantsjamdade@gmail.com"],
            subject: "Welcome to Tecstaq Testhub! Your Account Has Been Created", // Subject line.
            html: message,
        };
        //commit the transation
        await connection.commit();
        
        await transporter.sendMail(mailOptions);
        return res.status(200).json({
        status: 200,
        message: `Student created successfully.`,
      });

    } catch (error) {
        await connection.rollback();
        return error500(error, res);
    } finally {
        await connection.release();
    }
};

  
//login
const login = async (req, res) => {
  let email_id = req.body.email_id ? req.body.email_id.trim() : "";
  const password = req.body.password ? req.body.password.trim() : "";
  if (!email_id) {
    return error422("Email id is required.", res);
  } else if (!password) {
    return error422("Password is required.", res);
  }
  // Attempt to obtain a database connection
  let connection = await getConnection();
  try {
    //Start the transaction
    await connection.beginTransaction();
    //check email id is exist
    const query = `SELECT u.* FROM users u
    WHERE TRIM(LOWER(u.email_id)) = ? AND u.status = 1`;
    const result = await connection.query(query, [email_id.toLowerCase()]);
    const check_user = result[0][0];
    if (!check_user) {
        return error422("Authentication failed.", res);
    }
    if (check_user.role === 'student') {

    // ✅ Get student data
        const studentQuery = `
            SELECT * FROM student_registration 
            WHERE TRIM(LOWER(email_id)) = ?
        `;
        const [studentResult] = await connection.query(studentQuery, [email_id.toLowerCase()]);
        const student = studentResult[0];
        //   const studentQuery = `
        //     SELECT u.*, sr.test_id FROM users u
        //     LEFT JOIN student_registration sr ON sr.student_id = u.student_id
        //     WHERE TRIM(LOWER(sr.email_id)) = ? AND u.status = 1 AND u.role != 'admin'
        // `;
       

        const student_id = student.student_id ;
        const test_id = student.test_id;
        
        // ✅ Check if already attempted test
        const checkAttemptQuery = `
            SELECT * FROM questionnaire_answers 
            WHERE student_id = ? AND test_id = ?
        `;
        const [attemptResult] = await connection.query(checkAttemptQuery, [student_id, test_id]);

        if (attemptResult.length > 0) {
            return error422("You have already attempted this Test.", res);
        }

        // ✅ 3. Get test details
        const testQuery = `SELECT DATE_FORMAT(test_date, '%Y-%m-%d') AS test_date, start_time, end_time FROM tests WHERE test_id = ?`;
        const testResult = await connection.query(testQuery, [test_id]);
        const test_date = testResult[0][0].test_date;              
        const start_time = testResult[0][0].start_time;
        
        const end_time = testResult[0][0].end_time; 

        // ✅ 4. Time validation (10 min before)
        const testStartDateTime = new Date(`${test_date} ${start_time}`);
        
        const testEndDateTime = end_time ? new Date(`${test_date} ${end_time}`) : null;
        
        const allowedLoginTime = new Date(testStartDateTime.getTime() - 10 * 60 * 1000);
        const currentTime = new Date();

        if (currentTime < allowedLoginTime) {
            return error422("You can login only 10 minutes before the test start time.", res);
        }
        if (testEndDateTime && currentTime > testEndDateTime) {
            return error422("Test time is over.", res);
        }
    }

        // Check if the user with the provided Untitled id exists
        const checkUserUntitledQuery = "SELECT * FROM untitled WHERE user_id = ?";
        const [checkUserUntitledResult] = await connection.query(checkUserUntitledQuery, [check_user.user_id]);
        const user_untitled = checkUserUntitledResult[0];
        if (!user_untitled) {
            return error422("Authentication failed.", res);
        }

        const isPasswordValid = await bcrypt.compare(password, user_untitled.extenstions);
        if (!isPasswordValid) {
            return error422("Password wrong.", res);
        }
        // Generate a JWT token
        const token = jwt.sign(
            {
                user_id: user_untitled.user_id,
                email_id: check_user.email_id
        
            },
            "secret_this_should_be", // Use environment variable for secret key
            { expiresIn: "1h" }
        );
        const userDataQuery = `SELECT u.* FROM users u
        WHERE u.user_id = ? `;
        let userDataResult = await connection.query(userDataQuery, [check_user.user_id]);

        // Commit the transaction
        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: "Authentication successfully",
            token: token,
            expiresIn: 36000, // 1 hour in seconds,
            data: userDataResult[0][0],
        });

    } catch (error) {
        console.log(error);
        
        return error500(error, res)
    } finally {
        await connection.release();
    }
};


// get User list...
const getUsers = async (req, res) => {
    const { page, perPage, key } = req.query;

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        let getUserQuery = `SELECT u.* FROM users u WHERE 1`;

        let countQuery = `SELECT COUNT(*) AS total FROM users u 
        WHERE 1`;

        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            if (lowercaseKey === "activated") {
                getUserQuery += ` AND status = 1`;
                countQuery += ` AND status = 1`;
            } else if (lowercaseKey === "deactivated") {
                getUserQuery += ` AND status = 0`;
                countQuery += ` AND status = 0`;
            } else {
                getUserQuery += ` AND (LOWER(u.user_name) LIKE '%${lowercaseKey}%' || LOWER(u.role) LIKE '%${lowercaseKey}%')`;
                countQuery += ` AND (LOWER(u.user_name) LIKE '%${lowercaseKey}%' || LOWER(u.role) LIKE '%${lowercaseKey}%')`;
            }
        }
        getUserQuery += " ORDER BY u.cts DESC";

        // Apply pagination if both page and perPage are provided
        let total = 0;
        if (page && perPage) {
            const totalResult = await connection.query(countQuery);
            total = parseInt(totalResult[0][0].total);

            const start = (page - 1) * perPage;
            getUserQuery += ` LIMIT ${perPage} OFFSET ${start}`;
        }

        const result = await connection.query(getUserQuery);
        const user = result[0];

        // Commit the transaction
        await connection.commit();
        const data = {
            status: 200,
            message: "User retrieved successfully",
            data: user,
        };

        // Add pagination information if provided
        if (page && perPage) {
            data.pagination = {
                per_page: perPage,
                total: total,
                current_page: page,
                last_page: Math.ceil(total / perPage),
            };
        }

        return res.status(200).json(data);
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

//User by id
const getUser = async (req, res) => {
    const userId = parseInt(req.params.id);

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        const userQuery = `SELECT u.* FROM users u WHERE 1 AND u.user_id = ? `;
        const userResult = await connection.query(userQuery, [userId]);
        if (userResult[0].length == 0) {
            return error422("User Not Found.", res);
        }
        const user = userResult[0];

        return res.status(200).json({
            status: 200,
            message: "User Retrived Successfully",
            data: user
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

//Update User
const updateUser = async (req, res) => {
    const userId = parseInt(req.params.id);
    const user_name = req.body.user_name ? req.body.user_name.trim() : "";
    const email_id = req.body.email_id ? req.body.email_id.trim() : "";
    const mobile_number = req.body.mobile_number ? req.body.mobile_number :'';
    const role = req.body.role ? req.body.role.trim() : "";
    if (!user_name) {
        return error422("User name is required.", res);
    } else if (!email_id) {
        return error422("Email id is required.", res);
    } else if (!mobile_number) {
        return error422("Phone number is required.", res);
    } else if (!password) {
        return error422("Password is required.", res);
    } else if (!role) {
        return error422("Role is required.", res);
    }

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        // Check if user exists
        const userQuery = "SELECT * FROM users WHERE user_id  = ?";
        const userResult = await connection.query(userQuery, [userId]);
        if (userResult[0].length === 0) {
            return error422("User Not Found.", res);
        }

        // Update the user record with new data
        const updateQuery = `
            UPDATE users
            SET user_name = ?, email_id = ?, mobile_number = ?, role = ?
            WHERE user_id = ?
        `;

        await connection.query(updateQuery, [ user_name, email_id, mobile_number, role, userId]);

        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "User updated successfully.",
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

//status change of user...
const onStatusChange = async (req, res) => {
    const userId = parseInt(req.params.id);
    const status = parseInt(req.query.status); // Validate and parse the status parameter
    const group_id = parseInt(req.query.group_id);

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        // Check if the user exists
        const userQuery = "SELECT * FROM users WHERE user_id = ? ";
        const userResult = await connection.query(userQuery, [userId]);

        if (userResult[0].length == 0) {
            return res.status(404).json({
                status: 404,
                message: "User not found.",
            });
        }

        // Validate the status parameter
        if (status !== 0 && status !== 1) {
            return res.status(400).json({
                status: 400,
                message: "Invalid status value. Status must be 0 (inactive) or 1 (active).",
            });
        }

        // Soft update the user
        const updateQuery = `
            UPDATE users
            SET status = ?
            WHERE user_id = ? OR group_id = ?
        `;

        await connection.query(updateQuery, [status, userId, group_id]);

        const statusMessage = status === 1 ? "activated" : "deactivated";
        // Commit the transaction
        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: `User ${statusMessage} successfully.`,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
};

//get user active...
const getUserWma = async (req, res) => {
     const { department_id} = req.query;

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        let userQuery = `SELECT u.* FROM users u WHERE 1 AND u.status = 1`;
        userQuery += ` ORDER BY u.user_name ASC`;

        const userResult = await connection.query(userQuery);
        const user = userResult[0];

        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "User retrieved successfully.",
            data: user,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

//change password
const onChangePassword = async (req, res) => {
    const email_id = req.body.email_id ? req.body.email_id.trim() : "";
    const password = req.body.password || "";
    const new_password = req.body.new_password || "";
    const new_email = req.body.new_email ? req.body.new_email.trim() : "";

    if (!email_id) {
        return error422("Email Id required.", res);
    }
    if (!password) {
        return error422("Password is required.", res);
    }
    if (!new_password) {
        return error422("New password is required.", res);
    }

    let connection = await getConnection();

    try {
        await connection.beginTransaction();

        // Check if email_id exists
        const checkUserQuery = "SELECT * FROM users WHERE LOWER(TRIM(email_id)) = ? AND status = 1";
        const [checkUserResult] = await connection.query(checkUserQuery, [email_id.toLowerCase()]);
        if (checkUserResult.length === 0) {
            return error422('Email id is not found.', res);
        }

        const userData = checkUserResult[0]; // Extract the first row

        // Retrieve the hashed password from the database (update column name if needed)
        const untitledQuery = 'SELECT extenstions FROM untitled WHERE user_id = ?';
        const [untitledResult] = await connection.query(untitledQuery, [userData.user_id]);

        if (untitledResult.length === 0) {
            return error422("Password not found for this user.", res);
        }

        const hash = untitledResult[0].extenstions;
        if (!hash) {
            return error422('Stored password hash is missing.', res);
        }

        const isValid = await bcrypt.compare(password, hash);
        if (!isValid) {
            return error422('Incorrect password.', res);
        }

        // Hash the new password
        const newHashedPassword = await bcrypt.hash(new_password, 10);

        // Update the user's password in the database
        const updatePasswordQuery = `UPDATE untitled SET extenstions = ? WHERE user_id = ?`;
        await connection.query(updatePasswordQuery, [newHashedPassword, userData.user_id]);

        // If new email is provided, update it
        if (new_email) {
            // Check if the new email already exists
            const checkNewEmailQuery = "SELECT email_id FROM users WHERE LOWER(TRIM(email_id)) = ?";
            const [emailCheckResult] = await connection.query(checkNewEmailQuery, [new_email.toLowerCase()]);

            if (emailCheckResult.length > 0) {
                return error422("New email is already in use.", res);
            }

            // Update the email
            const updateEmailQuery = `UPDATE users SET email_id = ? WHERE user_id = ?`;
            await connection.query(updateEmailQuery, [new_email, userData.user_id]);
        }

        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: "Password updated successfully."
        });

    } catch (error) {
        await connection.rollback();
        error500(error, res);
    } finally {
        if (connection) connection.release();
    }
};

//send otp 
const sendOtp = async (req, res) => {
    const email_id = req.body.email_id;
    if (!email_id) {
        return error422("Email is  required.", res);
    }
    // Check if email_id exists
    const query = 'SELECT * FROM users WHERE TRIM(LOWER(email_id)) = ?';
    const result = await pool.query(query, [email_id.toLowerCase()]);
    if (result[0].length === 0) {
        return error422('Email id is not found.', res);
    }

    let user_name = result[0][0].user_name;

    let connection = await getConnection();
    try {
        //Start the transaction
        await connection.beginTransaction();
        const otp = Math.floor(100000 + Math.random() * 900000);
        const deleteQuery = `DELETE FROM otp WHERE cts < NOW() - INTERVAL 5 MINUTE`;
        const deleteResult = await connection.query(deleteQuery);

        const otpQuery = "INSERT INTO otp (otp, email_id) VALUES (?, ?)";
        const otpResult = await connection.query(otpQuery, [otp, email_id])

        const message = `
      <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Welcome to Tecstaq-helddesk.com</title>
          <style>
              div{
              font-family: Arial, sans-serif; 
               margin: 0px;
                padding: 0px;
                color:black;
              }
          </style>
        </head>
        <body>
        <div>
       <h2 style="text-transform: capitalize;">Hello ${user_name},</h2>
        <p>It seems you requested a password reset for your Tecstaq-helddesk account. Use the OTP below to complete the process and regain access to your account.</p>
        <h3>Your OTP: <strong>${otp}</strong></h3>
        <p>For security, this OTP will expire in 5 minutes. Please don’t share this code with anyone. If you didn’t request a password reset, please ignore this email or reach out to our support team for assistance.</p>
        <h4>What’s Next?</h4>
        <ol>
          <li>Enter the OTP on the password reset page.</li>
          <li>Set your new password, and you’re all set to log back in.</li>
        <li>Thank you for using Tecstaq-helddesk Application!</li>
        </ol>
        <p>Best regards,<br>The Tecstaq-helddesk Team</p>
         </div>
        </body>
        </html>`;

        // Validate required fields.
        if (!email_id || !message) {
            return res
                .status(400)
                .json({ status: "error", message: "Missing required fields" });
        }

        // Prepare the email message options.
        const mailOptions = {
            from: "support@tecstaq.com", // Sender address from environment variables.
            to: `${email_id}`, // Recipient's name and email address.
            //    replyTo: "rohitlandage86@gmail.com", // Sets the email address for recipient responses.
            //  bcc: "sushantsjamdade@gmail.com",
            // bcc: "sushantsjamdade@gmail.com",
            subject: "Reset Your Tecstaq-crm Password – OTP Inside", // Subject line.
            html: message,
        };

        // Send email 
        await transporter.sendMail(mailOptions);

        return res.status(200).json({
            status: 200,
            message: `OTP sent successfully to ${email_id}.`,

        })
    } catch (error) {
        return error500(error, res)
    } finally {
        if (connection) connection.release()
    }
}

//verify otp
const verifyOtp = async (req, res) => {
    const otp = req.body.otp ? req.body.otp : null;
    const email_id = req.body.email_id ? req.body.email_id.trim() : null;
    if (!otp) {
        return error422("Otp is required.", res);
    } else if (!email_id) {
        return error422("Email id is required.", res);
    }

    let connection = await getConnection();
    try {
        //Start the transaction
        await connection.beginTransaction();

        // Delete expired OTPs

        const deleteQuery = `DELETE FROM otp WHERE cts < NOW() - INTERVAL 5 MINUTE`;
        const deleteResult = await connection.query(deleteQuery);

        // Check if OTP is valid and not expired
        const verifyOtpQuery = `
        SELECT * FROM otp 
        WHERE TRIM(LOWER(email_id)) = ? AND otp = ?
      `;
        const verifyOtpResult = await connection.query(verifyOtpQuery, [email_id.trim().toLowerCase(), otp]);

        // If no OTP is found, return a failed verification message
        if (verifyOtpResult[0].length === 0) {
            return error422("OTP verification failed.", res);
        }

        // Check if the OTP is expired
        const otpData = verifyOtpResult;
        const otpCreatedTime = otpData.cts;
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

        if (otpCreatedTime < fiveMinutesAgo) {
            return error422("OTP has expired. Please request a new one.", res);
        }

        // OTP is valid and within the 5-minute limit
        return res.status(200).json({
            status: 200,
            message: "OTP verified successfully"
        });

    } catch (error) {
        return error500(error, res)
    } finally {
        if (connection) connection.release();
    }
};

//check email_id
const checkEmailId = async (req, res) => {
    const email_id = req.body.email_id ? req.body.email_id.trim() : ""; // Extract and trim email_id from request body
    if (!email_id) {
        return error422("Email Id required.", res);
    }

    let connection = await getConnection();
    try {
        //Start the transaction
        await connection.beginTransaction();

        // Check if email_id exists
        const query = 'SELECT * FROM users WHERE TRIM(LOWER(email_id)) = ?';
        const result = await connection.query(query, [email_id.toLowerCase()]);
        if (result[0].length === 0) {
            return error422('Email id is not found.', res);
        }
        const untitledData = result;

        return res.status(200).json({
            status: 200,
            message: "Email Id Exists",
            email_id: true,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release();
    }
};

//forget password
const forgotPassword = async (req, res) => {
    const email_id = req.body.email_id ? req.body.email_id.trim() : null;
    const newPassword = req.body.newPassword ? req.body.newPassword.trim() : null;
    const confirmPassword = req.body.confirmPassword ? req.body.confirmPassword.trim() : null;
    if (!email_id) {
        return error422("Email id is requried", res);
    } else if (!newPassword) {
        return error422("New password is required.", res);
    } else if (!confirmPassword) {
        return error422("Confirm password is required.", res);
    } else if (newPassword !== confirmPassword) {
        return error422("New password and Confirm password do not match.", res);
    }

    let connection = await getConnection();
    try {
        //Start the transaction
        await connection.beginTransaction();

        // Check if email_id exists
        const query = 'SELECT * FROM users WHERE TRIM(LOWER(email_id)) = ?';
        const result = await connection.query(query, [email_id.toLowerCase()]);
        if (result[0].length === 0) {
            return error404('Email id is not found.', res);
        }
        const untitledData = result[0][0];

        // Hash the new password
        const hash = await bcrypt.hash(confirmPassword, 10);

        const updateQuery = `UPDATE untitled SET extenstions = ? WHERE user_id = ?`;
        const [updateResult] = await connection.query(updateQuery, [hash, untitledData.user_id]);

        // Commit the transaction
        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: "Password has been updated successfully"
        })
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release();
    }
};

const sendOtpIfEmailIdNotExists = async (req, res) => {
    const email_id = req.body.email_id;
    if (!email_id) {
        return error422("Email is required.", res);
    }

    // Check if email_id exists
    const query = 'SELECT * FROM users WHERE TRIM(LOWER(email_id)) = ?';
    const result = await pool.query(query, [email_id.toLowerCase()]);

    if (result.rowCount > 0) {
        // If email_id exists, return an error response
        return error422('Email ID already exists. OTP will not be sent.', res);
    }

    let connection = await getConnection();
    try {
        //Start the transaction
        await connection.beginTransaction();

        // Generate a 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000);

        // Delete expired OTPs from the table (older than 5 minutes)
        const deleteQuery = `DELETE FROM otp WHERE cts < NOW() - INTERVAL 5 MINUTE`;
        const deleteResult = await connection.query(deleteQuery);

        // Insert the new OTP into the database
        const otpQuery = "INSERT INTO otp (otp, email_id) VALUES (?, ?)";
        await connection.query(otpQuery, [otp, email_id]);

        // Compose the email message with OTP details
        const message = `
      <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Welcome to Tecstaq-helpdesk.com</title>
          <style>
              div {
                font-family: Arial, sans-serif; 
                margin: 0px;
                padding: 0px;
                color: black;
              }
          </style>
        </head>
        <body>
        <div>
          <h2>Hello,</h2>
          <p>Thank you for registering at Tecstaq-helpdesk.com. Use the OTP below to complete your registration.</p>
          <h3>Your OTP: <strong>${otp}</strong></h3>
          <p>This OTP will expire in 5 minutes. Please don’t share this code with anyone.</p>
          <p>Best regards,<br>The Tecstaq-helpdesk Team</p>
        </div>
        </body>
        </html>`;

        // Email options
        const mailOptions = {
            from: "support@tecstaq.com",
            to: email_id,
            // replyTo: "rohitlandage86@gmail.com",
            // bcc: "sushantsjamdade@gmail.com",
            //bcc: "ushamyadav777@gmail.com"
            subject: "Your Registration OTP",
            html: message,
        };

        // Send the email
        await transporter.sendMail(mailOptions);

        // Return success response
        return res.status(200).json({
            status: 200,
            message: `OTP sent successfully to ${email_id}.`,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release();
    }
};

//get Technician ...
const deleteTechnician = async (req, res) => {
    const agentId = parseInt(req.params.id);

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        let deleteTechnicianQuery = `DELETE FROM customer_agents WHERE agents_id = ?`;
        const deleteTechnicianResult = await connection.query(deleteTechnicianQuery, [agentId]);

        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "Technician Delete successfully."
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
};

//User download
const getUserDownload = async (req, res) => {

    const { key } = req.query;

    let connection = await getConnection();
    try {
        await connection.beginTransaction();

        let getUserQuery = `SELECT u.*, d.department_name, r.role_name 
        FROM users u 
        LEFT JOIN departments d
        ON d.department_id = u.department_id
        LEFT JOIN roles r
        ON r.role_id = u.role_id
        WHERE 1 AND u.status = 1`;

        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            getUserQuery += ` AND (LOWER(name) LIKE '%${lowercaseKey}%')`;
        }

        getUserQuery += " ORDER BY u.created_at DESC";

        let result = await connection.query(getUserQuery);
        let user = result[0];

        if (user.length === 0) {
            return error422("No data found.", res);
        }


        user = user.map((item, index) => ({
            "Sr No": index + 1,
            "Create Date": item.cts,
            "User Name":item.user_name,
            "Email ID": item.email_id,
            "Phone No.": item.phone_number,
            "Role Name": item.role_name,
            "Department Name":item.department_name

            // "Status": item.status === 1 ? "activated" : "deactivated",
        }));

        // Create a new workbook
        const workbook = xlsx.utils.book_new();

        // Create a worksheet and add only required columns
        const worksheet = xlsx.utils.json_to_sheet(user);

        // Add the worksheet to the workbook
        xlsx.utils.book_append_sheet(workbook, worksheet, "UserInfo");

        // Create a unique file name
        const excelFileName = `exported_data_${Date.now()}.xlsx`;

        // Write the workbook to a file
        xlsx.writeFile(workbook, excelFileName);

        // Send the file to the client
        res.download(excelFileName, (err) => {
            if (err) {
                res.status(500).send("Error downloading the file.");
            } else {
                fs.unlinkSync(excelFileName);
            }
        });

        await connection.commit();
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release();
    }
};





module.exports = {
  createUser,
  login,
  getUsers,
  getUserWma,
  getUser,
  updateUser,
  onStatusChange,
  onChangePassword,
  sendOtp,
  verifyOtp,
  checkEmailId,
  forgotPassword,
  sendOtpIfEmailIdNotExists,
  deleteTechnician,
  getUserDownload
};