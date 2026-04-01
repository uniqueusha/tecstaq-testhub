
const pool = require("../../db");
const bcrypt = require("bcrypt");
//const xlsx = require("xlsx");
//const fs = require("fs");
//const path = require('path');

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

    // Check if group exists
    const isGroupsExist = "SELECT * FROM groups WHERE group_id  = ?";
    const isGroupsResult = await pool.query(isGroupsExist,[group_id]);
    if (isGroupsResult[0].length == 0) {
        return error422("Groups not found.", res);
    }

    let connection = await getConnection();

    try {
        // start the transaction
        await connection.beginTransaction();
        const insertQuery = "INSERT INTO student_registration (group_id, student_name, email_id, phone_number, gender, college_name, course, course_year, role)VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)";
        const result = await connection.query(insertQuery,[group_id, student_name, email_id, phone_number, gender, college_name, course, course_year, role]);
        const student_id = result[0].insertId

        //insert into user
        const insertUserQuery = `INSERT INTO users (user_name, email_id, mobile_number, role, group_id, student_id ) VALUES (?, ?, ?, ?, ?, ?)`;
        const insertUserValues = [ student_name, email_id, phone_number, role, group_id, student_id];
        const insertuserResult = await connection.query(insertUserQuery, insertUserValues);
        const user_id = insertuserResult[0].insertId;
        
        const hash = await bcrypt.hash(password, 10); // Hash the password using bcrypt

        //insert into Untitled
        const insertUntitledQuery =
        "INSERT INTO untitled (user_id, extenstions) VALUES (?,?)";
        const insertUntitledValues = [user_id, hash];
        const untitledResult = await connection.query(insertUntitledQuery, insertUntitledValues)

        await connection.commit()
        return res.status(200).json({
            status:200,
            message:"Student created successfully."
        })
    } catch (error) {
        console.log(error);
        
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

        // Check if group exists
        const isGroupsExist = "SELECT * FROM groups WHERE group_id  = ?";
        const isGroupsResult = await pool.query(isGroupsExist,[group_id]);
        if (isGroupsResult[0].length == 0) {
            return error422("Groups not found.", res);
        }
        // Check if the provided student exists and is active 
        const existingStudentQuery = "SELECT * FROM student_registration WHERE student_id =?";
        const existingStudentResult = await connection.query(existingStudentQuery, [studentId]);
        if (existingStudentResult[0].length == 0) {
            return error422("Student not found.", res);
        }

        // Update the Student record with new data
        const updateQuery = `
            UPDATE student_registration
            SET group_id = ?, student_name = ?, email_id = ?, phone_number = ?, gender = ?, college_name = ?, course = ?, course_year = ?, role = ?
            WHERE student_id = ?
        `;

        await connection.query(updateQuery, [ group_id, student_name, email_id, phone_number, gender, college_name, course, course_year, role, studentId]);
        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "Student updated successfully.",
        });
    } catch (error) {
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
    const { page, perPage, key } = req.query;

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        let getStudentQuery = `SELECT sr.*, g.group_name FROM student_registration sr
        LEFT JOIN groups g ON g.group_id = sr.group_id`;

        let countQuery = `SELECT COUNT(*) AS total FROM student_registration sr
        LEFT JOIN groups g ON g.group_id = sr.group_id`;

        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            if (lowercaseKey === "activated") {
                getStudentQuery += ` AND sr.status = 1`;
                countQuery += ` AND sr.status = 1`;
            } else if (lowercaseKey === "deactivated") {
                getStudentQuery += ` AND sr.status = 0`;
                countQuery += ` AND sr.status = 0`;
            } else {
                getStudentQuery += ` AND LOWER(student_name) LIKE '%${lowercaseKey}%' `;
                countQuery += ` AND LOWER(student_name) LIKE '%${lowercaseKey}%' `;
            }
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

        const studentQuery = `SELECT * FROM student_registration
        WHERE student_id = ?`;
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

        let studentQuery = `SELECT sr.*, g.group_name FROM student_registration sr
        LEFT JOIN groups g ON g.group_id = sr.group_id
        WHERE sr.status = 1 `;

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
    const group_id = parseInt(req.query.group_id);

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

        await connection.query(updateQuery, [is_approved, studentId, group_id]);

        // student approve than user active
        const updateUserQuery = `
            UPDATE users
            SET status = 1
            WHERE student_id = ?`;

        await connection.query(updateUserQuery, [ studentId]);

        // Commit the transaction
        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: `Student Approved successfully.`,
        });
    } catch (error) {
        console.log(error);
        
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
            SET status = 1
            WHERE group_id = ?`;

        await connection.query(updateUserQuery, [ groupId]);

        // Commit the transaction
        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: `Student Group Approved successfully.`,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
};

module.exports = {
    createStudent,
    getAllStudent,
    getStudentsWma,
    updateStudent,
    onStatusChange,
    getStudent,
    studentApprove,
    studentGroupApprove  
}