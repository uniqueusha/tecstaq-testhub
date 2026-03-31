
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

//create question Type
const createQuestionType = async (req, res)=>{
    const question_type = req.body.question_type ? req.body.question_type.trim():'';
    const description = req.body.description ? req.body.description.trim():'';
    

    if (!question_type) {
        return error422("question Type is required.", res);
    } 

    // Check if question type already
    const isquestionTypeExist = "SELECT * FROM question_type WHERE question_type  = ?";
    const isquestionTypeResult = await pool.query(isquestionTypeExist,[question_type]);
    if (isquestionTypeResult[0].length > 0) {
        return error422("question type is already exists.", res);
    }

    let connection = await getConnection();

    try {
        // start the transaction
        await connection.beginTransaction();
        const insertQuery = "INSERT INTO question_type ( question_type, description) VALUES (?, ?)";
        const result = await connection.query(insertQuery,[ question_type, description]);

        await connection.commit()
        return res.status(200).json({
            status:200,
            message:"question type created successfully."
        })
    } catch (error) {
        if (connection) connection.rollback();
        return error500(error, res);
    } finally{
        if (connection) connection.release();
    }
}

//Update question_type
const updateQuestionType = async (req, res) => {
    const questionTypeId = parseInt(req.params.id);
    const question_type = req.body.question_type ? req.body.question_type :'';
    const description = req.body.description ? req.body.description.trim():'';
    
    if (!question_type) {
        return error422("question type is required.", res);
    } 

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        // Check if question_type exists
        const isquestionTypeExist = "SELECT * FROM question_type WHERE question_type_id  = ?";
        const isquestionTypeResult = await pool.query(isquestionTypeExist,[questionTypeId]);
        if (isquestionTypeResult[0].length == 0) {
            return error422("question Type not found.", res);
        }

        // Update the questionType record with new data
        const updateQuery = `
            UPDATE question_type
            SET question_type = ?, description = ?
            WHERE question_type_id = ?
        `;

        await connection.query(updateQuery, [ question_type, description, questionTypeId]);
        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "question type updated successfully.",
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

//status change of question Type...
const onStatusChange = async (req, res) => {
    const questionTypeId = parseInt(req.params.id);
    const status = parseInt(req.query.status); // Validate and parse the status parameter


    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        // Check if question_type exists
        const isquestionTypeExist = "SELECT * FROM question_type WHERE question_type_id  = ?";
        const isquestionTypeResult = await pool.query(isquestionTypeExist,[questionTypeId]);
        if (isquestionTypeResult[0].length == 0) {
            return error422("question Type not found.", res);
        }

        // Validate the status parameter
        if (status !== 0 && status !== 1) {
            return res.status(400).json({
                status: 400,
                message: "Invalid status value. Status must be 0 (inactive) or 1 (active).",
            });
        }

        // Soft update the question Type status
        const updateQuery = `
            UPDATE question_type
            SET status = ?
            WHERE question_type_id = ?
        `;

        await connection.query(updateQuery, [status, questionTypeId]);

        const statusMessage = status === 1 ? "activated" : "deactivated";
        // Commit the transaction
        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: `question type ${statusMessage} successfully.`,
        });
    } catch (error) {
        console.log(error);
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
};

//all question_type list
const getAllQuestionType = async (req, res) => {
    const { page, perPage, key } = req.query;

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        let getquestionTypeQuery = `SELECT * FROM question_type`;

        let countQuery = `SELECT COUNT(*) AS total FROM question_type `;

        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            if (lowercaseKey === "activated") {
                getquestionTypeQuery += ` AND status = 1`;
                countQuery += ` AND status = 1`;
            } else if (lowercaseKey === "deactivated") {
                getquestionTypeQuery += ` AND status = 0`;
                countQuery += ` AND status = 0`;
            } else {
                getquestionTypeQuery += ` AND LOWER(question_type) LIKE '%${lowercaseKey}%' `;
                countQuery += ` AND LOWER(question_type) LIKE '%${lowercaseKey}%' `;
            }
        }
        getquestionTypeQuery += " ORDER BY cts DESC";

        // Apply pagination if both page and perPage are provided
        let total = 0;
        if (page && perPage) {
            const totalResult = await connection.query(countQuery);
            total = parseInt(totalResult[0][0].total);

            const start = (page - 1) * perPage;
            getquestionTypeQuery += ` LIMIT ${perPage} OFFSET ${start}`;
        }

        const result = await connection.query(getquestionTypeQuery);
        const questionType = result[0];

        // Commit the transaction
        await connection.commit();
        const data = {
            status: 200,
            message: "question Type retrieved successfully",
            data: questionType,
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

//question Type list by id
const getQuestionType = async (req, res) => {
    const questionTypeId = parseInt(req.params.id);
    
    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        const questionTypeQuery = `SELECT * FROM question_type
        WHERE question_type_id = ?`;
        const questionTypeResult = await connection.query(questionTypeQuery, [questionTypeId]);
        if (questionTypeResult[0].length == 0) {
            return error422("question Type Not Found.", res);
        }
        const questionType = questionTypeResult[0][0];

        return res.status(200).json({
            status: 200,
            message: "question type Retrived Successfully",
            data: questionType
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

//get question Type active...
const getQuestionTypeWma = async (req, res) => {
   
    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        let questionTypeQuery = `SELECT * FROM question_type 
        WHERE status = 1 `;

        questionTypeQuery += ` ORDER BY question_type ASC`;

        const questionTypeResult = await connection.query(questionTypeQuery);
        const questionType = questionTypeResult[0];

        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "question Type retrieved successfully.",
            data: questionType,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

module.exports = {
    createQuestionType,
    getAllQuestionType,
    getQuestionTypeWma,
    updateQuestionType,
    onStatusChange,
    getQuestionType
    
}