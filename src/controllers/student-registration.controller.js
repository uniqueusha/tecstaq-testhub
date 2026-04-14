
const pool = require("../../db");
const bcrypt = require("bcrypt");
const xlsx = require("xlsx");
const fs = require("fs");
const nodemailer = require("nodemailer");

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

//create Student
const createStudent = async (req, res)=>{
    const group_id = req.body.group_id ? req.body.group_id :'';
    const test_id = req.body.test_id ? req.body.test_id :'';
    const student_name = req.body.student_name ? req.body.student_name.trim():'';
    const email_id = req.body.email_id ? req.body.email_id.trim():'';
    const phone_number = req.body.phone_number ? req.body.phone_number:'';
    const gender = req.body.gender ? req.body.gender:'';
    const college_name = req.body.college_name ? req.body.college_name.trim():'';
    const course = req.body.course ? req.body.course.trim():'';
    const course_year = req.body.course_year ? req.body.course_year:'';
    const role = req.body.role ? req.body.role:'';
    const password = "123456";

    if (!student_name) {
        return error422("Student Name is required.", res);
    } else if (!email_id) {
        return error422("Email id is required.", res);
    } else if (!phone_number) {
        return error422("Phone number is required.", res);
    } else if (!course_year) {
        return error422("Course year is required.", res);
    } else if (!role) {
        return error422("Role is required.", res);
    } 

    // // Check if group exists
    // const isGroupsExist = "SELECT * FROM groups WHERE group_id  = ?";
    // const isGroupsResult = await pool.query(isGroupsExist,[group_id]);
    // if (isGroupsResult[0].length == 0) {
    //     return error422("Groups not found.", res);
    // }

    let connection = await getConnection();

    try {
        // start the transaction
        await connection.beginTransaction();
        const insertQuery = "INSERT INTO student_registration (group_id, test_id, student_name, email_id, phone_number, gender, college_name, course, course_year, role)VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        const result = await connection.query(insertQuery,[1, 1, student_name, email_id, phone_number, gender, college_name, course, course_year, role]);
        const student_id = result[0].insertId

        //insert into user
        const insertUserQuery = `INSERT INTO users (user_name, email_id, mobile_number, role, group_id, student_id ) VALUES (?, ?, ?, ?, ?, ?)`;
        const insertUserValues = [ student_name, email_id, phone_number, role, 1, student_id];
        const insertuserResult = await connection.query(insertUserQuery, insertUserValues);
        const user_id = insertuserResult[0].insertId;
        
        // const hash = await bcrypt.hash(password, 10); // Hash the password using bcrypt

        // //insert into Untitled
        // const insertUntitledQuery =
        // "INSERT INTO untitled (user_id, extenstions) VALUES (?,?)";
        // const insertUntitledValues = [user_id, hash];
        // const untitledResult = await connection.query(insertUntitledQuery, insertUntitledValues)

        await connection.commit()
        return res.status(200).json({
            status:200,
            message:"Student created successfully."
        })
    } catch (error) {
        if (connection) connection.rollback();
        return error500(error, res);
    } finally{
        if (connection) connection.release();
    }
}

//Update Student
const updateStudent = async (req, res) => {
    const studentId = parseInt(req.params.id);
    const group_id = req.body.group_id ? req.body.group_id :'';
    const test_id = req.body.test_id ? req.body.test_id :'';
    const student_name = req.body.student_name ? req.body.student_name.trim():'';
    const email_id = req.body.email_id ? req.body.email_id.trim():'';
    const phone_number = req.body.phone_number ? req.body.phone_number:'';
    const gender = req.body.gender ? req.body.gender:'';
    const college_name = req.body.college_name ? req.body.college_name.trim():'';
    const course = req.body.course ? req.body.course.trim():'';
    const course_year = req.body.course_year ? req.body.course_year:'';
    const role = req.body.role ? req.body.role:'';
    
    if (!student_name) {
        return error422("Student Name is required.", res);
    } else if (!email_id) {
        return error422("Email id is required.", res);
    } else if (!phone_number) {
        return error422("Phone number is required.", res);
    } else if (!course_year) {
        return error422("Course year is required.", res);
    } else if (!role) {
        return error422("Role is required.", res);
    } 

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        // // Check if group exists
        // const isGroupsExist = "SELECT * FROM groups WHERE group_id  = ?";
        // const isGroupsResult = await pool.query(isGroupsExist,[group_id]);
        // if (isGroupsResult[0].length == 0) {
        //     return error422("Groups not found.", res);
        // }
        // Check if the provided student exists and is active 
        const existingStudentQuery = "SELECT * FROM student_registration WHERE student_id =?";
        const existingStudentResult = await connection.query(existingStudentQuery, [studentId]);
        if (existingStudentResult[0].length == 0) {
            return error422("Student not found.", res);
        }

        // Update the Student record with new data
        const updateQuery = `
            UPDATE student_registration
            SET group_id = ?, test_id = ?, student_name = ?, email_id = ?, phone_number = ?, gender = ?, college_name = ?, course = ?, course_year = ?, role = ?
            WHERE student_id = ?
        `;

        await connection.query(updateQuery, [ 1,1,student_name, email_id, phone_number, gender, college_name, course, course_year, role, studentId]);

         // Update the user record with new data
        const updateUserQuery = `
            UPDATE users
            SET user_name = ?, email_id = ?, mobile_number = ?, role = ?, group_id = ?
            WHERE student_id = ?
        `;

        await connection.query(updateUserQuery, [ student_name, email_id, phone_number, "student",1, studentId]);

        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "Student updated successfully.",
        });
    } catch (error) {
        console.log(error);
        
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

//status change of Student...
const onStatusChange = async (req, res) => {
    const studentId = parseInt(req.params.id);
    const status = parseInt(req.query.status); // Validate and parse the status parameter


    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        // Check if Student exists
        const isStudentExist = "SELECT * FROM student_registration WHERE student_id  = ?";
        const isStudentResult = await pool.query(isStudentExist,[studentId]);
        if (isStudentResult[0].length == 0) {
            return error422("Student not found.", res);
        }

        // Validate the status parameter
        if (status !== 0 && status !== 1) {
            return res.status(400).json({
                status: 400,
                message: "Invalid status value. Status must be 0 (inactive) or 1 (active).",
            });
        }

        // Soft update the student status
        const updateQuery = `
            UPDATE student_registration
            SET status = ?
            WHERE student_id = ?
        `;

        await connection.query(updateQuery, [status, studentId]);

        const statusMessage = status === 1 ? "activated" : "deactivated";
        // Commit the transaction
        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: `Student ${statusMessage} successfully.`,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
};

//all Student list
const getAllStudent = async (req, res) => {
    const { page, perPage, key, group_id , test_id, fromDate, toDate} = req.query;

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        let getStudentQuery = `SELECT sr.*, g.group_name,t.test_name FROM student_registration sr
        LEFT JOIN groups g ON g.group_id = sr.group_id 
        LEFT JOIN tests t ON t.test_id = sr.test_id
        WHERE 1 AND role != 'admin'`;

        let countQuery = `SELECT COUNT(*) AS total FROM student_registration sr
        LEFT JOIN groups g ON g.group_id = sr.group_id 
        LEFT JOIN tests t ON t.test_id = sr.test_id
        WHERE 1 AND role != 'admin'`;

        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            if (lowercaseKey === "activated") {
                getStudentQuery += ` AND sr.status = 1`;
                countQuery += ` AND sr.status = 1`;
            } else if (lowercaseKey === "deactivated") {
                getStudentQuery += ` AND sr.status = 0`;
                countQuery += ` AND sr.status = 0`;
            } else {
                getStudentQuery += ` AND LOWER(sr.student_name) LIKE '%${lowercaseKey}%' `;
                countQuery += ` AND LOWER(sr.student_name) LIKE '%${lowercaseKey}%' `;
            }
        }
        // from date and to date
        if (fromDate && toDate) {
            getStudentQuery += ` AND DATE(sr.cts) BETWEEN '${fromDate}' AND '${toDate}'`;
            countQuery += ` AND DATE(sr.cts) BETWEEN '${fromDate}' AND '${toDate}'`;
        }
        if (group_id) {
            getStudentQuery += ` AND sr.group_id = ${group_id}`;
            countQuery += `  AND sr.group_id = ${group_id}`;
        }
        if (test_id) {
            getStudentQuery += ` AND sr.test_id = ${test_id}`;
            countQuery += `  AND sr.test_id = ${test_id}`;
        }
        getStudentQuery += " ORDER BY sr.cts DESC";

        // Apply pagination if both page and perPage are provided
        let total = 0;
        if (page && perPage) {
            const totalResult = await connection.query(countQuery);
            total = parseInt(totalResult[0][0].total);

            const start = (page - 1) * perPage;
            getStudentQuery += ` LIMIT ${perPage} OFFSET ${start}`;
        }

        const result = await connection.query(getStudentQuery);
        const students = result[0];

        // Commit the transaction
        await connection.commit();
        const data = {
            status: 200,
            message: "Students retrieved successfully",
            data: students,
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

//Student list by id
const getStudent = async (req, res) => {
    const studentId = parseInt(req.params.id);
    
    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        const studentQuery = `SELECT sr.*, g.group_name, t.test_name FROM student_registration sr
        LEFT JOIN groups g ON g.group_id = sr.group_id
        LEFT JOIN tests t ON t.test_id = sr.test_id
        WHERE student_id = ? AND role != 'admin'`;
        const studentResult = await connection.query(studentQuery, [studentId]);
        if (studentResult[0].length == 0) {
            return error422("Student Not Found.", res);
        }
        const student = studentResult[0][0];

        return res.status(200).json({
            status: 200,
            message: "Student Retrived Successfully",
            data: student
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

//get Student active...
const getStudentsWma = async (req, res) => {
   
    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        let studentQuery = `SELECT sr.*, g.group_name, t.test_name FROM student_registration sr
        LEFT JOIN groups g ON g.group_id = sr.group_id
        LEFT JOIN tests t ON t.test_id = sr.test_id
        WHERE sr.status = 1 AND role != 'admin'`;

        studentQuery += ` ORDER BY sr.student_name ASC`;

        const studentResult = await connection.query(studentQuery);
        const student = studentResult[0];

        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "Student retrieved successfully.",
            data: student,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

// Student approve...
const studentApprove = async (req, res) => {
    const studentId = parseInt(req.params.id);
    const is_approved = parseInt(req.query.is_approved); // Validate and parse the status parameter
    

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        // Check if Student exists
        const isStudentExist = "SELECT * FROM student_registration WHERE student_id  = ?";
        const isStudentResult = await pool.query(isStudentExist,[studentId]);
        if (isStudentResult[0].length == 0) {
            return error422("Student not found.", res);
        }

        // Soft update the student status
        const updateQuery = `
            UPDATE student_registration
            SET is_approved = ?
            WHERE student_id = ?`;

        await connection.query(updateQuery, [is_approved, studentId]);

        // student approve than user active
        const updateUserQuery = `
            UPDATE users
            SET status = ?
            WHERE student_id = ?`;

        await connection.query(updateUserQuery, [ is_approved, studentId]);

        const studentIDQuery = ` SELECT * FROM users WHERE student_id = ?`;
        const [studentIdResult] = await connection.query(studentIDQuery, [studentId]);
        
        const user_id = studentIdResult[0].user_id;
        let user_name = studentIdResult[0].user_name;
        const email_id = studentIdResult[0].email_id;
        if (is_approved === 1) {
        let length = 8,
        charset =
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
        password = "";
        for (let i = 0, n = charset.length; i < length; ++i) {
            password += charset.charAt(Math.floor(Math.random() * n));
        }

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
    
        // Commit the transaction
        await connection.commit();
        await transporter.sendMail(mailOptions);

        return res.status(200).json({
            status: 200,
            message: `Student Approved successfully.`,
        });
    }
 } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
};

// Student  group approve...
const studentGroupApprove = async (req, res) => {
    const groupId = parseInt(req.params.id);
    const is_approved = parseInt(req.query.is_approved); // Validate and parse the status parameter

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        // Check if Group exists
        const isGroupExist = "SELECT * FROM student_registration WHERE group_id  = ?";
        const isGroupResult = await pool.query(isGroupExist,[groupId]);
        if (isGroupResult[0].length == 0) {
            return error422("Group not found.", res);
        }

        // Soft update the student group status
        const updateQuery = `
            UPDATE student_registration
            SET is_approved = ?
            WHERE group_id = ?`;

        await connection.query(updateQuery, [is_approved, groupId]);

        // student approve than user active
        const updateUserQuery = `
            UPDATE users
            SET status = ?
            WHERE group_id = ?`;

        await connection.query(updateUserQuery, [ is_approved, groupId]);

        const studentIDQuery = ` SELECT * FROM users WHERE group_id = ?`;
        const [studentIdResult] = await connection.query(studentIDQuery, [groupId]);
        
        if (is_approved === 1) {
            for (let user of studentIdResult) {
        const user_id = user.user_id;
        const user_name = user.user_name;
        const email_id = user.email_id;
        let length = 8,
        charset =
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
        password = "";
        for (let i = 0, n = charset.length; i < length; ++i) {
            password += charset.charAt(Math.floor(Math.random() * n));
        }
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
            to: studentIdResult.map(item => item.email_id), // Recipient's name and email address."sushantsjamdade@gmail.com",
            // bcc: ["sushantsjamdade@gmail.com"],
            subject: "Welcome to Tecstaq Testhub! Your Account Has Been Created", // Subject line.
            html: message,
        };
        await transporter.sendMail(mailOptions);
    }
            
        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: `Student Group Approved successfully.`,
        });
    }
    } catch (error) {
        console.log(error);
        
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
};



const uploadStudentExcel = async (req, res) => {
    const { file } = req.body; // base64 string

    if (!file) {
        return res.status(400).json({ message: "Base64 file required" });
    }

    let connection = await getConnection();

    try {
        await connection.beginTransaction();

        // Convert Base64 → Buffer
        const buffer = Buffer.from(file, "base64");

        // Read Excel from buffer
        const workbook = xlsx.read(buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        const sheetData = xlsx.utils.sheet_to_json(sheet);

        for (let row of sheetData) {

            // Skip empty rows
            if (!row.student_name && !row.email_id) continue;

            // Get values safely
            const group_id = row.group_id || "";
            const test_id = row.test_id || "";
            const student_name = row.student_name?.toString().trim();
            const email_id = row.email_id?.toString().trim();
            const phone_number = row.phone_number?.toString();
            const gender = row.gender || "";
            const college_name = row.college_name?.toString().trim();
            const course = row.course?.toString().trim();
            const course_year = row.course_year || "";
            const role = row.role || "";

            // Validation
            if (!student_name || !email_id || !phone_number || !course_year ) {
                throw new Error(`Missing required fields for ${student_name || "row"}`);
            }

        //     // Check if group exists
        // const isGroupExist = "SELECT * FROM groups WHERE group_id  = ?";
        // const isGroupResult = await pool.query(isGroupExist,[group_id]);
        // if (isGroupResult[0].length == 0) {
        //     return error422("Group not found.", res);
        // }
            // Insert into student_registration
            const [studentResult] = await connection.query(
                `INSERT INTO student_registration 
                (group_id, test_id, student_name, email_id, phone_number, gender, college_name, course, course_year, role)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    1,
                    1,
                    student_name,
                    email_id,
                    phone_number,
                    gender,
                    college_name,
                    course,
                    course_year,
                    "student"
                ]
            );

            const student_id = studentResult.insertId;

            // Insert into users
            const [userResult] = await connection.query(
                `INSERT INTO users 
                (user_name, email_id, mobile_number, role, group_id, student_id)
                VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    student_name,
                    email_id,
                    phone_number,
                    "student",
                    1,
                    student_id
                ]
            );

            const user_id = userResult.insertId;

            // ✅ Hash password
            const hash = await bcrypt.hash("123456", 10);

            // ✅ Insert into untitled (password table)
            await connection.query(
                `INSERT INTO untitled (user_id, extenstions) VALUES (?, ?)`,
                [user_id, hash]
            );
        }

        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "Excel uploaded and data inserted successfully"
        });
        
    } catch (error) {
        console.log(error);
        
        if (connection) await connection.rollback();
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
};

//count Student
const getStudentCount = async (req, res) => {
    const { key } = req.query;
    

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();
        let get_student_count = 0;
       
        // count
        let countStudentQuery = `SELECT COUNT(*) AS total FROM student_registration sr
        WHERE 1  `;
       
        let countStudentResult = await connection.query(countStudentQuery);
        get_student_count = parseInt(countStudentResult[0][0].total);

        // Commit the transaction
        await connection.commit();
        const data = {
            status: 200,
            message: "Student Count",
            get_student_count:get_student_count,   
        };

        return res.status(200).json(data);
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

module.exports = {
    createStudent,
    getAllStudent,
    getStudentsWma,
    updateStudent,
    onStatusChange,
    getStudent,
    studentApprove,
    studentGroupApprove ,
    uploadStudentExcel,
    getStudentCount
}