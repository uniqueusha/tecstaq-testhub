
const pool = require("../../db");
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

//create Test
const createTest = async (req, res)=>{
    const group_id = req.body.group_id ? req.body.group_id:'';
    const test_name = req.body.test_name ? req.body.test_name.trim():'';
    const duration = req.body.duration ? req.body.duration:'';
    const total_marks = req.body.total_marks ? req.body.total_marks:'';
    const start_time = req.body.start_time ? req.body.start_time.trim():'';
    const end_time = req.body.end_time ? req.body.end_time.trim():'';
    
    if (!start_time) {
        return error422("Start Time is required.", res);
    } else if (!end_time) {
        return error422("End Time is required.", res);
    }

    // Check if Test already
    const isTestExist = "SELECT * FROM tests WHERE test_name = ?";
    const isTestResult = await pool.query(isTestExist,[test_name]);
    if (isTestResult[0].length > 0) {
        return error422("Test Name is already exists.", res);
    }

    let connection = await getConnection();

    try {
        // start the transaction
        await connection.beginTransaction();
        const insertQuery = "INSERT INTO tests ( group_id, test_name, duration, total_marks, start_time, end_time) VALUES (?, ?, ?, ?, ?, ?)";
        const result = await connection.query(insertQuery,[ group_id, test_name, duration, total_marks, start_time, end_time]);

        await connection.commit()
        return res.status(200).json({
            status:200,
            message:"Test created successfully."
        })
    } catch (error) {
        if (connection) connection.rollback();
        return error500(error, res);
    } finally{
        if (connection) connection.release();
    }
}

//Update Test
const updateTest = async (req, res) => {
    const testId = parseInt(req.params.id);
    const group_id = req.body.group_id ? req.body.group_id:'';
    const test_name = req.body.test_name ? req.body.test_name.trim():'';
    const duration = req.body.duration ? req.body.duration:'';
    const total_marks = req.body.total_marks ? req.body.total_marks:'';
    const start_time = req.body.start_time ? req.body.start_time.trim():'';
    const end_time = req.body.end_time ? req.body.end_time.trim():'';
    
    if (!start_time) {
        return error422("Start Time is required.", res);
    } else if (!end_time) {
        return error422("End Time is required.", res);
    }

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        // Check if Test exists
        const isTestsExist = "SELECT * FROM tests WHERE test_id  = ?";
        const isTestsResult = await pool.query(isTestsExist,[testId]);
        if (isTestsResult[0].length == 0) {
            return error422("Tests not found.", res);
        }

        // Update the Test record with new data
        const updateQuery = `
            UPDATE tests
            SET group_id = ?, test_name = ?, duration = ?, total_marks = ?, start_time = ?, end_time = ?
            WHERE test_id = ?
        `;

        await connection.query(updateQuery, [ group_id, test_name, duration, total_marks, start_time, end_time, testId]);
        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "Test updated successfully.",
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

//status change of Test...
const onStatusChange = async (req, res) => {
    const testId = parseInt(req.params.id);
    const status = parseInt(req.query.status); // Validate and parse the status parameter

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        // Check if Test exists
        const isTestExist = "SELECT * FROM tests WHERE test_id  = ?";
        const isTestResult = await pool.query(isTestExist,[testId]);
        if (isTestResult[0].length == 0) {
            return error422("Test not found.", res);
        }

        // Validate the status parameter
        if (status !== 0 && status !== 1) {
            return res.status(400).json({
                status: 400,
                message: "Invalid status value. Status must be 0 (inactive) or 1 (active).",
            });
        }

        // Soft update the Test status
        const updateQuery = `
            UPDATE tests
            SET status = ?
            WHERE test_id = ?
        `;

        await connection.query(updateQuery, [status, testId]);

        const statusMessage = status === 1 ? "activated" : "deactivated";
        // Commit the transaction
        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: `Test ${statusMessage} successfully.`,
        });
    } catch (error) {
        console.log(error);
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
};

//all Test list
const getAllTest = async (req, res) => {
    const { page, perPage, key } = req.query;

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        let getTestQuery = `SELECT t.*, g.group_name FROM tests t
        LEFT JOIN groups g ON g.group_id = t.group_id
        WHERE 1 AND role != admin`;

        let countQuery = `SELECT COUNT(*) AS total FROM tests t 
        LEFT JOIN groups g ON g.group_id = t.group_id
        WHERE 1 AND role != admin`;

        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            if (lowercaseKey === "activated") {
                getTestQuery += ` AND t.status = 1`;
                countQuery += ` AND t.status = 1`;
            } else if (lowercaseKey === "deactivated") {
                getTestQuery += ` AND t.status = 0`;
                countQuery += ` AND t.status = 0`;
            } else {
                getTestQuery += ` AND LOWER(t.test_name) LIKE '%${lowercaseKey}%' `;
                countQuery += ` AND LOWER(t.test_name) LIKE '%${lowercaseKey}%' `;
            }
        }
        getTestQuery += " ORDER BY t.cts DESC";

        // Apply pagination if both page and perPage are provided
        let total = 0;
        if (page && perPage) {
            const totalResult = await connection.query(countQuery);
            total = parseInt(totalResult[0][0].total);

            const start = (page - 1) * perPage;
            getTestQuery += ` LIMIT ${perPage} OFFSET ${start}`;
        }

        const result = await connection.query(getTestQuery);
        const test = result[0];

        // Commit the transaction
        await connection.commit();
        const data = {
            status: 200,
            message: "Test retrieved successfully",
            data: test,
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

//Test list by id
const getTest = async (req, res) => {
    const testId = parseInt(req.params.id);
    
    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        const testQuery = `SELECT t.*, g.group_name FROM tests t
        LEFT JOIN groups g ON g.group_id = t.group_id
        WHERE t.test_id = ? AND role != admin`;
        const testResult = await connection.query(testQuery, [testId]);
        if (testResult[0].length == 0) {
            return error422("Test Not Found.", res);
        }
        const test = testResult[0][0];

        return res.status(200).json({
            status: 200,
            message: "Test Retrived Successfully",
            data: test
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

//get Test active...
const getTestWma = async (req, res) => {
    const { group_id } = req.query;
    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        let testQuery = `SELECT * FROM tests 
        WHERE status = 1 AND role != admin`;

        if (group_id) {
            testQuery += ` AND group_id = ${group_id}`;
        }
        testQuery += ` ORDER BY test_name ASC`;
        const testResult = await connection.query(testQuery);
        const test = testResult[0];

        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "Test retrieved successfully.",
            data: test,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

module.exports = {
    createTest,
    getAllTest,
    getTestWma,
    updateTest,
    onStatusChange,
    getTest
}