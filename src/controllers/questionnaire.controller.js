
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

//create questionnaire
const createQuestionnaire = async (req, res)=>{
    const test_id = req.body.test_id ? req.body.test_id:'';
    const questionnaireHeader = req.body.questionnaireHeader ? req.body.questionnaireHeader:[];

    if (!test_id) {
        return error422("Test id is required.", res);
    } 

    // Check if test_id already
    const isTestExist = "SELECT * FROM tests WHERE test_id = ?";
    const isTestResult = await pool.query(isTestExist,[test_id]);
    if (isTestResult[0].length == 0) {
        return error422("Test Not Found.", res);
    }

    let connection = await getConnection();

    try {
        // start the transaction
        await connection.beginTransaction();

        const questionQuery = "INSERT INTO questionnaire ( test_id ) VALUES (?)";
        const questionResult = await connection.query(questionQuery,[ test_id ]);
        const questionnaire_id = questionResult[0].insertId;

        let questionnaireHeaderArray = questionnaireHeader
        for (let i = 0; i < questionnaireHeaderArray.length; i++) {
            const element = questionnaireHeaderArray[i];
            const question = element.question ? element.question : '';
            const question_type_id = element.question_type_id ? element.question_type_id : '';
            const answer = element.answer ? element.answer:'';
            const questionnaireFooter = element.questionnaireFooter ? element.questionnaireFooter:[];

            const insertQuery = "INSERT INTO questionnaire_header (questionnaire_id, question, question_type_id, answer) VALUES (?, ?, ?, ?)";
            const result = await connection.query(insertQuery,[ questionnaire_id, question, question_type_id, answer]);
            const questionnaire_header_id = result[0].insertId;

        //insert into questionnaire Footer in Array
        let questionnaireFooterArray = questionnaireFooter
        for (let j = 0; j < questionnaireFooterArray.length; j++) {
            const elements = questionnaireFooterArray[j];
            const option = elements.option ? elements.option : '';
        
            let insertquestionnaireFooterQuery = 'INSERT INTO questionnaire_footer ( questionnaire_id, questionnaire_header_id, option) VALUES (?, ?, ?)';
            let insertquestionnaireFooterValues = [ questionnaire_id, questionnaire_header_id, option ];
            let insertquestionnaireFooterResult = await connection.query(insertquestionnaireFooterQuery, insertquestionnaireFooterValues);
        }
       }
        await connection.commit()
        return res.status(200).json({
            status:200,
            message:"questionnaire created successfully."
        })
    } catch (error) {
        console.log(error);
        
        if (connection) connection.rollback();
        return error500(error, res);
    } finally{
        if (connection) connection.release();
    }
}

//Update questionnaire
const updateQuestionnaire = async (req, res) => {
    const questionnaireId = parseInt(req.params.id);
    const test_id = req.body.test_id ? req.body.test_id:'';
    const questionnaireHeader = req.body.questionnaireHeader ? req.body.questionnaireHeader:[];

    if (!test_id) {
        return error422("Test id is required.", res);
    } 

    // Check if test_id already
    const isTestExist = "SELECT * FROM tests WHERE test_id = ?";
    const isTestResult = await pool.query(isTestExist,[test_id]);
    if (isTestResult[0].length == 0) {
        return error422("Test Not Found.", res);
    }

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        // Check if questionnaire exists
        const isquestionnaireExist = "SELECT * FROM questionnaire_header WHERE questionnaire_header_id  = ?";
        const isquestionnaireResult = await connection.query(isquestionnaireExist,[questionnaireId]);
        if (isquestionnaireResult[0].length == 0) {
            return error422("questionnaire not found.", res);
        }

         // Update the Questionnaire  record with new data
        const updateQuestionnaireQuery = `
            UPDATE questionnaire
            SET test_id = ? 
            WHERE questionnaire_id = ?
        `;
        await connection.query(updateQuestionnaireQuery, [ test_id, questionnaireId]);

         
    
        // Update the questionnaire header record with new data
        let questionnaireHeaderArray = questionnaireHeader
        for (let i = 0; i < questionnaireHeaderArray.length; i++) {
            const element = questionnaireHeaderArray[i];
            let questionnaire_header_id = element.questionnaire_header_id ? element.questionnaire_header_id : '';
            const question = element.question ? element.question : '';
            const question_type_id = element.question_type_id ? element.question_type_id : '';
            const answer = element.answer ? element.answer:'';
            const questionnaireFooter = element.questionnaireFooter ? element.questionnaireFooter:[];

            let final_header_id = questionnaire_header_id;


            if (questionnaire_header_id) {
                const updateQuery = `UPDATE questionnaire_header SET question = ?, question_type_id = ?, answer = ? WHERE questionnaire_header_id = ? AND questionnaire_id = ?`;
                await connection.query(updateQuery, [ question, question_type_id, answer, questionnaire_header_id, questionnaireId]);
            } else {
                const insertQuery = "INSERT INTO questionnaire_header (questionnaire_id, question, question_type_id, answer) VALUES (?, ?, ?, ?)";
                const result = await connection.query(insertQuery,[ questionnaireId, question, question_type_id, answer]);
                final_header_id = result[0].insertId;
                
                
            }
            //insert into questionnaire Footer in Array
            let questionnaireFooterArray = questionnaireFooter
            for (let j = 0; j < questionnaireFooterArray.length; j++) {
                const elements = questionnaireFooterArray[j];
                const questionnaire_footer_id = elements.questionnaire_footer_id ? elements.questionnaire_footer_id :'';
                const option = elements.option ? elements.option : '';
            
                if (questionnaire_footer_id) {
                    let updateQuery = `UPDATE questionnaire_footer SET option  = ? WHERE questionnaire_footer_id = ? AND questionnaire_header_id = ?`;
                    let updateValues = [ questionnaireId, option, questionnaire_footer_id ];
                    let updateResult = await connection.query(updateQuery, updateValues);
                } else {
                    let insertquestionnaireFooterQuery = 'INSERT INTO questionnaire_footer (questionnaire_id,questionnaire_header_id, option) VALUES (?, ?, ?)';
                    let insertquestionnaireFooterValues = [ questionnaireId, final_header_id, option ];
                    let insertquestionnaireFooterResult = await connection.query(insertquestionnaireFooterQuery, insertquestionnaireFooterValues);
                }
            }
        }

        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "questionnaire updated successfully.",
        });
    } catch (error) {
        console.log(error);
        
       return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

//status change of questionnaire...
const onStatusChange = async (req, res) => {
    const questionnaireId = parseInt(req.params.id);
    const status = parseInt(req.query.status); // Validate and parse the status parameter


    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        // Check if questionnaire exists
        const isquestionnaireExist = "SELECT * FROM questionnaire_header WHERE questionnaire_header_id  = ?";
        const isquestionnaireResult = await pool.query(isquestionnaireExist,[questionnaireId]);
        if (isquestionnaireResult[0].length == 0) {
            return error422("question Type not found.", res);
        }

        // Validate the status parameter
        if (status !== 0 && status !== 1) {
            return res.status(400).json({
                status: 400,
                message: "Invalid status value. Status must be 0 (inactive) or 1 (active).",
            });
        }

        // Soft update the questionnaire status
        const updateQuery = `
            UPDATE questionnaire_header
            SET status = ?
            WHERE questionnaire_header_id = ?
        `;

        await connection.query(updateQuery, [status, questionnaireId]);

        const statusMessage = status === 1 ? "activated" : "deactivated";
        // Commit the transaction
        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: `questionnaire ${statusMessage} successfully.`,
        });
    } catch (error) {
        console.log(error);
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
};

//all questionnaire list
const getAllQuestionnaireOld = async (req, res) => {
    const { page, perPage, key } = req.query;

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        let getquestionnaireQuery = `SELECT q.*, t.test_name FROM questionnaire q
        LEFT JOIN tests t ON t.test_id = q.test_id
        WHERE 1`;

        let countQuery = `SELECT COUNT(*) AS total FROM questionnaire q
        LEFT JOIN tests t ON t.test_id = q.test_id
        WHERE 1`;

        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            if (lowercaseKey === "activated") {
                getquestionnaireQuery += ` AND q.status = 1`;
                countQuery += ` AND q.status = 1`;
            } else if (lowercaseKey === "deactivated") {
                getquestionnaireQuery += ` AND q.status = 0`;
                countQuery += ` AND q.status = 0`;
            } else {
                getquestionnaireQuery += ` AND LOWER(t.test_name) LIKE '%${lowercaseKey}%' `;
                countQuery += ` AND LOWER(t.test_name) LIKE '%${lowercaseKey}%' `;
            }
        }
        getquestionnaireQuery += " ORDER BY q.cts DESC";

        // Apply pagination if both page and perPage are provided
        let total = 0;
        if (page && perPage) {
            const totalResult = await connection.query(countQuery);
            total = parseInt(totalResult[0][0].total);

            const start = (page - 1) * perPage;
            getquestionnaireQuery += ` LIMIT ${perPage} OFFSET ${start}`;
        }

        const result = await connection.query(getquestionnaireQuery);
        const questionnaire = result[0];

        for (let i = 0; i < questionnaire.length; i++) {
            const element = questionnaire[i];
            let getquestionnaireHeaderQuery = `SELECT qh.*, qt.question_type FROM questionnaire_header qh
            LEFT JOIN question_type qt ON qt.question_type_id = qh.question_type_id
            WHERE qh.questionnaire_id = ${element.questionnaire_id} AND qh.status = 1`;

            getquestionnaireHeaderQuery += ` ORDER BY qh.cts DESC`;

            const questionnaireHeaderResult = await connection.query(getquestionnaireHeaderQuery);
            const questionnaireHeader = questionnaireHeaderResult[0];
        
        // Fetch questionnaire footer
        for (let j = 0; j < questionnaireHeader.length; j++) {
            const element = questionnaireHeader[j];
            let getquestionnaireFooterQuery = `SELECT * FROM questionnaire_footer
            WHERE questionnaire_header_id = ${element.questionnaire_header_id} AND status = 1`;

            getquestionnaireFooterQuery += ` ORDER BY cts DESC`;

            const questionnaireFooterResult = await connection.query(getquestionnaireFooterQuery);
            questionnaireHeader[j]['questionnaireFooter'] = questionnaireFooterResult[0];
        }
        questionnaire[i]['questionnaireHeader'] = questionnaireHeader;
        }
        // Commit the transaction
        await connection.commit();
        const data = {
            status: 200,
            message: "questionnaire retrieved successfully",
            data: questionnaire,
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

//all questionnaire list
const getAllQuestionnaire = async (req, res) => {
    const { page, perPage, key } = req.query;

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        let getquestionnaireQuery = `SELECT COUNT(q.test_id) AS total_question, q.questionnaire_id, t.test_name, t.duration, t.total_marks, t.start_time, t.end_time, q.status,q.cts FROM questionnaire q
        LEFT JOIN tests t ON t.test_id = q.test_id
        WHERE 1`;

        let countQuery = `SELECT COUNT(*) AS total FROM questionnaire q
        LEFT JOIN tests t ON t.test_id = q.test_id
        WHERE 1`;

        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            if (lowercaseKey === "activated") {
                getquestionnaireQuery += ` AND q.status = 1`;
                countQuery += ` AND q.status = 1`;
            } else if (lowercaseKey === "deactivated") {
                getquestionnaireQuery += ` AND q.status = 0`;
                countQuery += ` AND q.status = 0`;
            } else {
                getquestionnaireQuery += ` AND LOWER(t.test_name) LIKE '%${lowercaseKey}%' `;
                countQuery += ` AND LOWER(t.test_name) LIKE '%${lowercaseKey}%' `;
            }
        }
        getquestionnaireQuery += " ORDER BY q.cts DESC";

        // Apply pagination if both page and perPage are provided
        let total = 0;
        if (page && perPage) {
            const totalResult = await connection.query(countQuery);
            total = parseInt(totalResult[0][0].total);

            const start = (page - 1) * perPage;
            getquestionnaireQuery += ` LIMIT ${perPage} OFFSET ${start}`;
        }

        const result = await connection.query(getquestionnaireQuery);
        const questionnaire = result[0];

    
        // Commit the transaction
        await connection.commit();
        const data = {
            status: 200,
            message: "questionnaire retrieved successfully",
            data: questionnaire,
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

//questionnaire list by id
const getQuestionnaire = async (req, res) => {
    const questionnaireId = parseInt(req.params.id);
    
    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        let getquestionnaireQuery = `SELECT q.*, t.test_name FROM questionnaire q
        LEFT JOIN tests t ON t.test_id = q.test_id
        WHERE q.questionnaire_id = ?`;
        let questionnaireResult = await connection.query(getquestionnaireQuery, [questionnaireId]);
        if (questionnaireResult[0].length == 0) {
            return error422("questionnaire Not Found.", res);
        }
        const questionnaire = questionnaireResult[0][0];

        //get header
         let headerQuery = `SELECT qh.*, qt.question_type FROM questionnaire_header qh
            LEFT JOIN question_type qt ON qt.question_type_id = qh.question_type_id
            WHERE qh.questionnaire_id = ? AND qh.status = 1`;
        let headerResult = await connection.query(headerQuery, [questionnaireId]);
        let headers = headerResult[0];

        //Loop headers and attach footer inside
        for (let i = 0; i < headers.length; i++) {
            const header = headers[i];
            let footerQuery = `SELECT * FROM questionnaire_footer WHERE questionnaire_header_id = ? AND status = 1`;
            let footerResult = await connection.query(footerQuery, [header.questionnaire_header_id]);

            //Attach footer inside header
            headers[i]['questionnaireFooter'] = footerResult[0];
        }

        // Attach headers to questionnaire
        questionnaire['questionnaireHeader'] = headers;

        return res.status(200).json({
            status: 200,
            message: "questionnaire Retrived Successfully",
            data: questionnaire
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

//get questionnaire active...
const getQuestionnaireWma = async (req, res) => {
   
    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        let questionnaireQuery = `SELECT * FROM questionnaire_header 
        WHERE status = 1 `;

        questionnaireQuery += ` ORDER BY question ASC`;

        const questionnaireResult = await connection.query(questionnaireQuery);
        const questionnaire = questionnaireResult[0];

        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "questionnaire retrieved successfully.",
            data: questionnaire,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

module.exports = {
    createQuestionnaire,
    getAllQuestionnaire,
    getQuestionnaireWma,
    updateQuestionnaire,
    onStatusChange,
    getQuestionnaire
    
}