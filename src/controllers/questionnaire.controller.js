
const pool = require("../../db");
const xlsx = require("xlsx");
const fs = require("fs");
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
const createQuestionnaire = async (req, res) => {
    const test_id = req.body.test_id ? req.body.test_id : '';
    const questionnaireHeader = req.body.questionnaireHeader ? req.body.questionnaireHeader : [];

    if (!test_id) {
        return error422("Test id is required.", res);
    }

    // Check if test_id already
    const isTestExist = "SELECT * FROM tests WHERE test_id = ?";
    const isTestResult = await pool.query(isTestExist, [test_id]);
    if (isTestResult[0].length == 0) {
        return error422("Test Not Found.", res);
    }

    let connection = await getConnection();

    try {
        // start the transaction
        await connection.beginTransaction();

        const questionQuery = "INSERT INTO questionnaire ( test_id ) VALUES (?)";
        const questionResult = await connection.query(questionQuery, [test_id]);
        const questionnaire_id = questionResult[0].insertId;

        let questionnaireHeaderArray = questionnaireHeader
        for (let i = 0; i < questionnaireHeaderArray.length; i++) {
            const element = questionnaireHeaderArray[i];
            const question = element.question ? element.question : '';
            const question_mark = element.question_mark ? element.question_mark : '';
            const question_type_id = element.question_type_id ? element.question_type_id : '';
            const answer = element.answer ? element.answer : '';
            const questionnaireFooter = element.questionnaireFooter ? element.questionnaireFooter : [];

            const insertQuery = "INSERT INTO questionnaire_header (questionnaire_id, question, question_mark, question_type_id, answer) VALUES (?, ?, ?, ?, ?)";
            const result = await connection.query(insertQuery, [questionnaire_id, question, question_mark, question_type_id, answer]);
            const questionnaire_header_id = result[0].insertId;

            //insert into questionnaire Footer in Array
            let questionnaireFooterArray = questionnaireFooter
            for (let j = 0; j < questionnaireFooterArray.length; j++) {
                const elements = questionnaireFooterArray[j];
                const option = elements.option ? elements.option : '';

                let insertquestionnaireFooterQuery = 'INSERT INTO questionnaire_footer ( questionnaire_id, questionnaire_header_id, option) VALUES (?, ?, ?)';
                let insertquestionnaireFooterValues = [questionnaire_id, questionnaire_header_id, option];
                let insertquestionnaireFooterResult = await connection.query(insertquestionnaireFooterQuery, insertquestionnaireFooterValues);
            }
        }
        await connection.commit()
        return res.status(200).json({
            status: 200,
            message: "questionnaire created successfully."
        })
    } catch (error) {
        if (connection) connection.rollback();
        return error500(error, res);
    } finally {
        if (connection) connection.release();
    }
}

//Update questionnaire
const updateQuestionnaire = async (req, res) => {
    const questionnaireId = parseInt(req.params.id);
    const test_id = req.body.test_id ? req.body.test_id : '';
    const questionnaireHeader = req.body.questionnaireHeader ? req.body.questionnaireHeader : [];

    if (!test_id) {
        return error422("Test id is required.", res);
    }

    // Check if test_id already
    const isTestExist = "SELECT * FROM tests WHERE test_id = ?";
    const isTestResult = await pool.query(isTestExist, [test_id]);
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
        const isquestionnaireResult = await connection.query(isquestionnaireExist, [questionnaireId]);
        if (isquestionnaireResult[0].length == 0) {
            return error422("questionnaire not found.", res);
        }

        // Update the Questionnaire  record with new data
        const updateQuestionnaireQuery = `
            UPDATE questionnaire
            SET test_id = ? 
            WHERE questionnaire_id = ?
        `;
        await connection.query(updateQuestionnaireQuery, [test_id, questionnaireId]);

        // Update the questionnaire header record with new data
        let questionnaireHeaderArray = questionnaireHeader
        for (let i = 0; i < questionnaireHeaderArray.length; i++) {
            const element = questionnaireHeaderArray[i];
            let questionnaire_header_id = element.questionnaire_header_id ? element.questionnaire_header_id : '';
            const question = element.question ? element.question : '';
            const question_mark = element.question_mark ? element.question_mark : '';
            const question_type_id = element.question_type_id ? element.question_type_id : '';
            const answer = element.answer ? element.answer : '';
            const questionnaireFooter = element.questionnaireFooter ? element.questionnaireFooter : [];

            let final_header_id = questionnaire_header_id;


            if (questionnaire_header_id) {
                const updateQuery = `UPDATE questionnaire_header SET question = ?, question_mark = ?, question_type_id = ?, answer = ? WHERE questionnaire_header_id = ? AND questionnaire_id = ?`;
                await connection.query(updateQuery, [question, question_mark, question_type_id, answer, questionnaire_header_id, questionnaireId]);
            } else {
                const insertQuery = "INSERT INTO questionnaire_header (questionnaire_id, question, question_type_id, answer) VALUES (?, ?, ?, ?)";
                const result = await connection.query(insertQuery, [questionnaireId, question, question_type_id, answer]);
                final_header_id = result[0].insertId;


            }
            //insert into questionnaire Footer in Array
            let questionnaireFooterArray = questionnaireFooter
            for (let j = 0; j < questionnaireFooterArray.length; j++) {
                const elements = questionnaireFooterArray[j];
                const questionnaire_footer_id = elements.questionnaire_footer_id ? elements.questionnaire_footer_id : '';
                const option = elements.option ? elements.option : '';

                if (questionnaire_footer_id) {
                    let updateQuery = `UPDATE questionnaire_footer SET option  = ?, questionnaire_id = ? WHERE questionnaire_footer_id = ? AND questionnaire_header_id = ?`;
                    let updateValues = [ option, questionnaireId, questionnaire_footer_id, questionnaire_header_id];
                    let updateResult = await connection.query(updateQuery, updateValues);
                } else {
                    let insertquestionnaireFooterQuery = 'INSERT INTO questionnaire_footer (questionnaire_id,questionnaire_header_id, option) VALUES (?, ?, ?)';
                    let insertquestionnaireFooterValues = [questionnaireId, final_header_id, option];
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
        const isquestionnaireResult = await pool.query(isquestionnaireExist, [questionnaireId]);
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
const getAllQuestionnaireStudent = async (req, res) => {
    const { page, perPage, key, student_id } = req.query;
    const newDate = new Date(); // Current timestamp
    const todayDate = newDate.toISOString().split('T')[0];
    // const todayDate = newDate.toLocaleDateString('en-CA');

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        let getquestionnaireQuery = `SELECT s.test_id, g.group_name, s.student_id, t.test_name, t.test_date, t.duration, t.total_marks, t.start_time, t.end_time, q.questionnaire_id FROM student_registration s
        LEFT JOIN tests t ON t.test_id = s.test_id
        LEFT JOIN questionnaire q ON q.test_id = s.test_id
        LEFT JOIN groups g ON g.group_id = t.group_id
        WHERE DATE(t.test_date) = '${todayDate}'`;

        let countQuery = `SELECT COUNT(*) AS total FROM student_registration s
        LEFT JOIN tests t ON t.test_id = s.test_id
        LEFT JOIN questionnaire q ON q.test_id = s.test_id
        LEFT JOIN groups g ON g.group_id = t.group_id
        WHERE DATE(t.test_date) = '${todayDate}'`;

        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            if (lowercaseKey === "activated") {
                getquestionnaireQuery += ` AND s.status = 1`;
                countQuery += ` AND s.status = 1`;
            } else if (lowercaseKey === "deactivated") {
                getquestionnaireQuery += ` AND s.status = 0`;
                countQuery += ` AND s.status = 0`;
            } else {
                getquestionnaireQuery += ` AND LOWER(t.test_name) LIKE '%${lowercaseKey}%' `;
                countQuery += ` AND LOWER(t.test_name) LIKE '%${lowercaseKey}%' `;
            }
        }
        if (student_id) {
            getquestionnaireQuery += ` AND s.student_id = ${student_id}`;
            countQuery += ` AND s.student_id = ${student_id}`;
        }

        getquestionnaireQuery += " ORDER BY s.cts DESC";

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

const getAllQuestionnaireold = async (req, res) => {
    const { page, perPage, key, student_id, group_id } = req.query;
    const newDate = new Date(); // Current timestamp
    const todayDate = newDate.toISOString().split('T')[0];
    // const todayDate = newDate.toLocaleDateString('en-CA');

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();
        
        let getquestionnaireQuery = `SELECT DISTINCT q.questionnaire_id, 
        q.test_id, 
    g.group_id,
    g.group_name, 
    s.student_id, 
    t.test_name, 
    t.test_date, 
    t.duration, 
    t.total_marks, 
    t.start_time, 
    t.end_time,
    q.cts,
    (
        SELECT COUNT(*) 
        FROM questionnaire_header qh 
        WHERE qh.questionnaire_id = q.questionnaire_id
    ) AS total_questions
FROM questionnaire q
LEFT JOIN tests t ON t.test_id = q.test_id
LEFT JOIN student_registration s ON q.test_id = s.test_id
LEFT JOIN groups g ON g.group_id = t.group_id
        WHERE 1`;

        let countQuery = `SELECT COUNT(*) AS total FROM questionnaire q
        LEFT JOIN tests t ON t.test_id = q.test_id
LEFT JOIN student_registration s ON q.test_id = s.test_id
LEFT JOIN groups g ON g.group_id = t.group_id
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
        if (student_id) {
            getquestionnaireQuery += ` AND s.student_id = ${student_id} AND DATE(t.test_date) = '${todayDate}'`;
            countQuery += ` AND s.student_id = ${student_id} AND DATE(t.test_date) = '${todayDate}'`;
        }
        if (group_id) {
            getquestionnaireQuery += ` AND g.group_id = ${group_id}`
            countQuery += ` AND g.group_id = ${group_id}`;
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

const getAllQuestionnaire = async (req, res) => {
    const { page, perPage, key, student_id, group_id } = req.query;

    const todayDate = new Date().toISOString().split('T')[0];

    let connection = await getConnection();

    try {
        await connection.beginTransaction();

        let query = `
            SELECT 
                q.questionnaire_id,
                q.test_id,
                g.group_id,
                g.group_name,
                t.test_name,
                t.test_date,
                t.duration,
                t.total_marks,
                t.start_time,
                t.end_time,
                q.cts,
                (
                    SELECT COUNT(*) 
                    FROM questionnaire_header qh 
                    WHERE qh.questionnaire_id = q.questionnaire_id
                ) AS total_questions
            FROM questionnaire q
            LEFT JOIN tests t ON t.test_id = q.test_id
            LEFT JOIN groups g ON g.group_id = t.group_id
            WHERE 1
        `;
        let countQuery = `SELECT COUNT(*) AS total FROM questionnaire q
       LEFT JOIN tests t ON t.test_id = q.test_id
            LEFT JOIN groups g ON g.group_id = t.group_id
            WHERE 1`;

        // 🔍 Search
        if (key) {
            query += ` AND t.test_name LIKE '%${key}%'`;
        }

        // 👤 Student filter (NO JOIN → NO duplicate)
        if (student_id) {
            query += ` AND q.test_id IN ( SELECT test_id 
                    FROM student_registration 
                    WHERE student_id = ${student_id}
                ) AND DATE(t.test_date) = '${todayDate}' `;
            countQuery += ` AND q.test_id IN ( SELECT test_id 
                    FROM student_registration 
                    WHERE student_id = ${student_id}
                ) AND DATE(t.test_date) = '${todayDate}'`
        }

        // 👥 Group filter
        if (group_id) {
            query += ` AND g.group_id = ${group_id}`;
        }

        query += ` ORDER BY q.cts DESC`;

         // Apply pagination if both page and perPage are provided
        let total = 0;
        if (page && perPage) {
            const totalResult = await connection.query(countQuery);
            total = parseInt(totalResult[0][0].total);

            const start = (page - 1) * perPage;
            query += ` LIMIT ${perPage} OFFSET ${start}`;
        }

        const [result] = await connection.query(query);

        await connection.commit();

       const data = {
            status: 200,
            message: "Questionnaire fetched successfully",
            data: result
        };
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
        console.log(error);
        return error500(error, res);
    } finally {
        if (connection) connection.release();
    }
};

//questionnaire list by id
const getQuestionnaire = async (req, res) => {
    const questionnaireId = parseInt(req.params.id);

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        let getquestionnaireQuery = `SELECT q.*, s.test_id,g.group_name,t.duration,t.total_marks,t.start_time,t.end_time, s.student_id,t.test_date, t.test_name FROM questionnaire q
        LEFT JOIN tests t ON t.test_id = q.test_id
        LEFT JOIN student_registration s ON s.test_id = t.test_id
        LEFT JOIN questionnaire_header qh ON qh.questionnaire_id = q.questionnaire_id
        LEFT JOIN groups g ON g.group_id = t.group_id
        WHERE q.questionnaire_id = ?`;
        let questionnaireResult = await connection.query(getquestionnaireQuery, [questionnaireId]);
        if (questionnaireResult[0].length == 0) {
            return error422("questionnaire Not Found.", res);
        }
        const questionnaire = questionnaireResult[0][0];

        //get header
        let headerQuery = `SELECT qh.questionnaire_header_id, qh.questionnaire_id, qh.question, qh.question_mark, qh.question_type_id, qh.status, qh.cts, qt.question_type FROM questionnaire_header qh
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

//get student list test wise
const getStudentTestQuestionnaire = async (req, res) => {
    const { page, perPage, key, student_id, questionnaire_id } = req.query;

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        let getquestionnaireQuery = `SELECT s.test_id, s.student_id, t.test_name, t.duration, t.total_marks,t.start_time,t.end_time, q.questionnaire_id, qh.question, qh.answer,qh.questionnaire_header_id FROM student_registration s
        LEFT JOIN tests t ON t.test_id = s.test_id
        LEFT JOIN questionnaire q ON q.test_id = s.test_id
        LEFT JOIN questionnaire_header qh ON qh.questionnaire_id = q.questionnaire_id
        WHERE 1`;

        let countQuery = `SELECT COUNT(*) AS total FROM student_registration s
        LEFT JOIN tests t ON t.test_id = s.test_id
        LEFT JOIN questionnaire q ON q.test_id = s.test_id
        LEFT JOIN questionnaire_header qh ON qh.questionnaire_id = q.questionnaire_id
        WHERE 1`;


        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            if (lowercaseKey === "activated") {
                getquestionnaireQuery += ` AND s.status = 1`;
                countQuery += ` AND s.status = 1`;
            } else if (lowercaseKey === "deactivated") {
                getquestionnaireQuery += ` AND s.status = 0`;
                countQuery += ` AND s.status = 0`;
            } else {
                getquestionnaireQuery += ` AND LOWER(t.test_name) LIKE '%${lowercaseKey}%' `;
                countQuery += ` AND LOWER(t.test_name) LIKE '%${lowercaseKey}%' `;
            }
        }

        if (student_id) {
            getquestionnaireQuery += ` AND s.student_id = ${student_id}`;
            countQuery += ` AND s.student_id = ${student_id}`;
        }
        if (questionnaire_id) {
            getquestionnaireQuery += ` AND q.questionnaire_id = ${questionnaire_id}`;
            countQuery += ` AND q.questionnaire_id = ${questionnaire_id}`;
        }
        getquestionnaireQuery += " ORDER BY s.cts DESC";

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



        for (let j = 0; j < questionnaire.length; j++) {
            const element = questionnaire[j];

            let getquestionnaireFooterQuery = `SELECT * FROM questionnaire_footer
            WHERE questionnaire_header_id = ${element.questionnaire_header_id} AND status = 1`;

            getquestionnaireFooterQuery += ` ORDER BY cts DESC`;

            const questionnaireFooterResult = await connection.query(getquestionnaireFooterQuery);
            questionnaire[j]['questionnaireFooter'] = questionnaireFooterResult[0];
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

//add answer
const createAnswer = async (req, res) => {
    const student_id = req.body.student_id ? req.body.student_id : '';
    const test_id = req.body.test_id ? req.body.test_id :'';
    const tab_status = req.body.tab_status ? req.body.tab_status : null ;
    
    const answer = req.body.answer ? req.body.answer : [];
    if (!student_id) {
        return error422("Student id is required.", res);
    }
    // Check if Student  exist
    const isStudentExist = "SELECT * FROM student_registration WHERE student_id = ?";
    const isStudentResult = await pool.query(isStudentExist, [student_id]);
    if (isStudentResult[0].length == 0) {
        return error422("Student Not Found", res);
    }

    let connection = await getConnection();

    try {
        // start the transaction
        await connection.beginTransaction();
        const insertAnswerQuery = "INSERT INTO questionnaire_answers ( student_id, test_id, tab_status ) VALUES ( ? , ?, ?)";
        const answerResult = await connection.query(insertAnswerQuery, [student_id, test_id, tab_status]);
        const answer_id = answerResult[0].insertId;

        const cutOffQuery = ` SELECT * FROM tests WHERE test_id = ? `;
        const cutOffResult = await connection.query(cutOffQuery,[test_id]);
        const cut_off = cutOffResult[0][0].cut_off;
        
        let totalMarks = 0;
        let answerArray = answer;
        for (let i = 0; i < answerArray.length; i++) {
            const element = answerArray[i];
            const questionnaire_header_id = element.questionnaire_header_id ? element.questionnaire_header_id : 0;
            const questionnaire_footer_id = element.questionnaire_footer_id ? element.questionnaire_footer_id : 0;

            // Check if header  exist
            const isHeaderExist = "SELECT * FROM questionnaire_header WHERE questionnaire_header_id = ?";
            const isHeaderResult = await connection.query(isHeaderExist, [questionnaire_header_id]);

            // if (isHeaderResult[0].length == 0) {
            //     return error422("Header Not Found", res);
            // }
            let correct_answer = isHeaderResult[0][0].answer;
            // Check if footer  exist
            const isFooterExist = "SELECT * FROM questionnaire_footer WHERE questionnaire_footer_id = ?";
            const isFooterResult = await connection.query(isFooterExist, [questionnaire_footer_id]);
            // if (isFooterResult[0].length == 0) {
            //     return error422("Footer Not Found", res);
            // }
            // let selected_answer = isFooterResult[0][0].option || null;
            let selected_answer = isFooterResult[0]?.[0]?.option || null;
            // ✅ Compare Answers
            let result_status = (correct_answer === selected_answer) ? "correct" : "wrong";

            let marks = 0
            if (correct_answer === selected_answer) {
                marks = isHeaderResult[0][0].question_mark || 0
            }
            // ✅ Add total marks
            totalMarks += marks;
            const insertQuery = "INSERT INTO questionnaire_answers_footer (answer_id, questionnaire_header_id, questionnaire_footer_id, is_correct, result_status, marks ) VALUES ( ?, ?, ?, ?, ?, ?)";
            const result = await connection.query(insertQuery, [answer_id, questionnaire_header_id, questionnaire_footer_id, correct_answer, result_status, marks]);
        }
        // ✅ Final Result Calculation
        let final_result = totalMarks >= cut_off ? "Pass" : "Fail";
        const updateQuery = `
            UPDATE questionnaire_answers 
            SET final_result = ?
            WHERE answer_id = ?
        `;

        await connection.query(updateQuery, [final_result,  answer_id]);


        await connection.commit()
        return res.status(200).json({
            status: 200,
            message: "Answer created successfully."
        })
    } catch (error) {
        if (connection) connection.rollback();
        return error500(error, res);
    } finally {
        if (connection) connection.release();
    }
}

//answer list
const getAllAnswer = async (req, res) => {
    const { page, perPage, key, student_id } = req.query;

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        let getAnswerQuery = `SELECT qa.*,u.user_name, t.test_name, t.test_date,t.duration,t.total_marks,t.start_time,t.end_time FROM questionnaire_answers qa
        LEFT JOIN users u ON u.student_id = qa.student_id
        LEFT JOIN student_registration s ON s.student_id = qa.student_id
        LEFT JOIN tests t ON t.test_id = s.test_id
        WHERE 1`;

        let countQuery = `SELECT COUNT(*) AS total FROM questionnaire_answers qa
        LEFT JOIN users u ON u.student_id = qa.student_id
        LEFT JOIN student_registration s ON s.student_id = qa.student_id
        LEFT JOIN tests t ON t.test_id = s.test_id
        WHERE 1`;

        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            if (lowercaseKey === "activated") {
                getAnswerQuery += ` AND qa.status = 1`;
                countQuery += ` AND qa.status = 1`;
            } else if (lowercaseKey === "deactivated") {
                getAnswerQuery += ` AND qa.status = 0`;
                countQuery += ` AND qa.status = 0`;
            } else {
                getAnswerQuery += ` AND LOWER(u.user_name) LIKE '%${lowercaseKey}%' `;
                countQuery += ` AND LOWER(u.user_name) LIKE '%${lowercaseKey}%' `;
            }
        }
        if (student_id) {
            getAnswerQuery += ` AND qa.student_id = ${student_id}`;
            countQuery += ` AND qa.student_id = ${student_id}`;
        }

        getAnswerQuery += " ORDER BY qa.cts DESC";

        // Apply pagination if both page and perPage are provided
        let total = 0;
        if (page && perPage) {
            const totalResult = await connection.query(countQuery);
            total = parseInt(totalResult[0][0].total);

            const start = (page - 1) * perPage;
            getAnswerQuery += ` LIMIT ${perPage} OFFSET ${start}`;
        }

        const result = await connection.query(getAnswerQuery);
        const answers = result[0];
        for (let i = 0; i < answers.length; i++) {
            const element = answers[i];
           
            let getAnswerFooterQuery = `SELECT qaf.*, qh.question,qf.option AS student_select_ans FROM questionnaire_answers_footer qaf
            LEFT JOIN questionnaire_header qh ON qh.questionnaire_header_id = qaf.questionnaire_header_id
            LEFT JOIN questionnaire_footer qf ON qf.questionnaire_footer_id = qaf.questionnaire_footer_id
            WHERE qaf.answer_id = ${element.answer_id} AND qaf.status = 1`;

            getAnswerFooterQuery += ` ORDER BY qaf.cts DESC`;

            const answerFooterResult = await connection.query(getAnswerFooterQuery);
            answers[i]['answer'] = answerFooterResult[0];
        }

        // Commit the transaction
        await connection.commit();
        const data = {
            status: 200,
            message: "Answer retrieved successfully",
            data: answers,
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

//result

const getResultOld = async (req, res) => {
    const { page, perPage, student_id, fromDate, toDate,final_result } = req.query;

    let connection = await getConnection();

    try {
        await connection.beginTransaction();

        let query = ` SELECT s.student_id,s.student_name,q.test_id,t.test_name,t.total_marks,t.cut_off,qa.final_result,
        COUNT(qaf.answer_id) AS attempted_questions,
        SUM(CASE WHEN qaf.result_status = 'correct' THEN 1 ELSE 0 END) AS correct_questions,
        SUM(CASE WHEN qaf.result_status = 'wrong' THEN 1 ELSE 0 END) AS wrong_questions,
        SUM(CASE WHEN qaf.is_correct = 1 THEN qaf.marks ELSE 0 END) AS correct_marks
    FROM questionnaire q
    LEFT JOIN tests t ON t.test_id = q.test_id
    LEFT JOIN student_registration s ON q.test_id = s.test_id
    LEFT JOIN questionnaire_answers qa ON qa.student_id = s.student_id
    LEFT JOIN questionnaire_answers_footer qaf ON qaf.answer_id = qa.answer_id WHERE 1
`;
let countQuery = `SELECT COUNT(qa.answer_id) AS total FROM questionnaire q
    LEFT JOIN tests t ON t.test_id = q.test_id
    LEFT JOIN student_registration s ON q.test_id = s.test_id
    LEFT JOIN questionnaire_answers qa ON qa.student_id = s.student_id
    LEFT JOIN questionnaire_answers_footer qaf ON qaf.answer_id = qa.answer_id WHERE 1
`;

        if (fromDate && toDate) {
            query += ` AND DATE(qa.cts) BETWEEN '${fromDate}' AND '${toDate}'`;
            countQuery += ` AND DATE(qa.cts) BETWEEN '${fromDate}' AND '${toDate}'`;
        }
       
        // Filter by student
        if (student_id) {
            query += ` AND s.student_id = ${student_id}`;
            countQuery +=` AND s.student_id = ${student_id}`;
        }

        if (final_result) {
            query += ` AND final_result = ${final_result}`;
            countQuery +=` AND final_result = ${final_result}`;
        }


        query += ` GROUP BY s.student_id, q.test_id`;
        query += ` ORDER BY s.student_id DESC`;

        // Apply pagination if both page and perPage are provided
        let total = 0;
        if (page && perPage) {
            const totalResult = await connection.query(countQuery);
            total = parseInt(totalResult[0][0].total);

            const start = (page - 1) * perPage;
            query += ` LIMIT ${perPage} OFFSET ${start}`;
        }
        const result = await connection.query(query, countQuery);

        await connection.commit();

    const data = {
            status: 200,
            message: "Result retrieved successfully",
            data: result[0]
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
        console.log(error);
        
        await connection.rollback();
        return error500(error, res);
    } finally {
        if (connection) connection.release();
    }
};

const getResult = async (req, res) => {
    const { page, perPage, student_id, fromDate, toDate,final_result } = req.query;

    let connection = await getConnection();

    try {
        await connection.beginTransaction();

        let query = ` SELECT qa.student_id,s.student_name,qa.test_id,t.test_name,t.total_marks,t.cut_off,qa.final_result,
        COUNT(qaf.answer_id) AS attempted_questions,
        SUM(CASE WHEN qaf.result_status = 'correct' THEN 1 ELSE 0 END) AS correct_questions,
        SUM(CASE WHEN qaf.result_status = 'wrong' THEN 1 ELSE 0 END) AS wrong_questions,
COALESCE(SUM(CASE WHEN qaf.result_status = 'correct' THEN qaf.marks ELSE 0 END), 0) AS correct_marks
    FROM questionnaire_answers qa
    LEFT JOIN tests t ON t.test_id = qa.test_id
    LEFT JOIN student_registration s ON qa.student_id = s.student_id
    LEFT JOIN questionnaire_answers_footer qaf ON qaf.answer_id = qa.answer_id WHERE 1
`;
let countQuery = `SELECT COUNT (DISTINCT qa.answer_id) AS total FROM questionnaire_answers qa
    LEFT JOIN tests t ON t.test_id = qa.test_id
    LEFT JOIN student_registration s ON qa.student_id = s.student_id
    LEFT JOIN questionnaire_answers_footer qaf ON qaf.answer_id = qa.answer_id WHERE 1
`;

        if (fromDate && toDate) {
            query += ` AND DATE(qa.cts) BETWEEN '${fromDate}' AND '${toDate}'`;
            countQuery += ` AND DATE(qa.cts) BETWEEN '${fromDate}' AND '${toDate}'`;
        }
       
        // Filter by student
        if (student_id) {
            query += ` AND qa.student_id = ${student_id}`;
            countQuery +=` AND qa.student_id = ${student_id}`;
        }

        if (final_result) {
            query += ` AND qa.final_result = "${final_result}"`;
            countQuery +=` AND qa.final_result = "${final_result}"`;
        }


        query += ` GROUP BY qa.answer_id`;
        query += ` ORDER BY qa.answer_id DESC`;

        // Apply pagination if both page and perPage are provided
        let total = 0;
        if (page && perPage) {
            const totalResult = await connection.query(countQuery);
            total = parseInt(totalResult[0][0].total);

            const start = (page - 1) * perPage;
            query += ` LIMIT ${perPage} OFFSET ${start}`;
        }
        const result = await connection.query(query, countQuery);

        await connection.commit();

    const data = {
            status: 200,
            message: "Result retrieved successfully",
            data: result[0]
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
        console.log(error);
        
        await connection.rollback();
        return error500(error, res);
    } finally {
        if (connection) connection.release();
    }
};

//result download
const getResultDownload = async (req, res) => {

    const { key, student_id, fromDate, toDate,final_result } = req.query;

    let connection = await getConnection();
    try {
        await connection.beginTransaction();

        let getResultQuery = `SELECT qa.student_id,s.student_name,qa.test_id,t.test_name,t.total_marks,t.cut_off,qa.final_result,
        COUNT(qaf.answer_id) AS attempted_questions,
        SUM(CASE WHEN qaf.result_status = 'correct' THEN 1 ELSE 0 END) AS correct_questions,
        SUM(CASE WHEN qaf.result_status = 'wrong' THEN 1 ELSE 0 END) AS wrong_questions,
COALESCE(SUM(CASE WHEN qaf.result_status = 'correct' THEN qaf.marks ELSE 0 END), 0) AS correct_marks
    FROM questionnaire_answers qa
    LEFT JOIN tests t ON t.test_id = qa.test_id
    LEFT JOIN student_registration s ON qa.student_id = s.student_id
    LEFT JOIN questionnaire_answers_footer qaf ON qaf.answer_id = qa.answer_id WHERE 1
`;

        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            if (lowercaseKey === "activated") {
                getResultQuery += ` AND status = 1`;
            } else if (lowercaseKey === "deactivated") {
                getResultQuery += ` AND status = 0`;
            } else {
                getResultQuery += ` AND (LOWER(domain_name) LIKE '%${lowercaseKey}%' || LOWER(owner) LIKE '%${lowercaseKey}%' || LOWER(mobile_number) LIKE '%${lowercaseKey}%' || LOWER(amount) LIKE '%${lowercaseKey}%' || DATE_FORMAT(expiry_date, ''%d-%m-%Y'') LIKE '%${lowercaseKey}%')`;
            }
        }

        if (fromDate && toDate) {
            getResultQuery += ` AND DATE(qa.cts) BETWEEN '${fromDate}' AND '${toDate}'`;
        }
       
        // Filter by student
        if (student_id) {
            getResultQuery += ` AND qa.student_id = ${student_id}`;        }

        if (final_result) {
            getResultQuery += ` AND qa.final_result = "${final_result}"`;
        }

        getResultQuery += " ORDER BY qa.cts DESC";

        let result = await connection.query(getResultQuery);
        let resultDownload = result[0];

if (
    resultDownload.length === 0 ||
    resultDownload.every(item => item.attempted_questions === 0)
) {
    return error422("No data found.", res);
}

        resultDownload = resultDownload.map((item, index) => ({
            "Sr No": index + 1,
            "Test": item.test_name,
            "Name": item.student_name,
            "Attempted Questions": item.attempted_questions,
            "Correct Questions": item.correct_questions,
            "Wrong Questions": item.wrong_questions,
            "Obtained Marks": item.correct_marks,
            "Total Marks": item.total_marks,
            "Result": item.final_result,

        }));

        // Create a new workbook
        const workbook = xlsx.utils.book_new();

        // Create a worksheet and add only required columns
        const worksheet = xlsx.utils.json_to_sheet(resultDownload);

        // Add the worksheet to the workbook
        xlsx.utils.book_append_sheet(workbook, worksheet, "resultDownloadInfo");

        // Create a unique file name
        const excelFileName = `exported_data_${Date.now()}.xlsx`;

        // Write the workbook to a file
        xlsx.writeFile(workbook, excelFileName);

        // Send the file to the client
        res.download(excelFileName, (err) => {
            if (err) {
                console.error(err);
                res.status(500).send("Error downloading the file.");
            } else {
                fs.unlinkSync(excelFileName);
            }
        });

        await connection.commit();
    } catch (error) {
        console.log(error);
        
        return error500(error, res);
    } finally {
        if (connection) connection.release();
    }
};

//count Result
const getResultDashboard = async (req, res) => {
    const { key } = req.query;
    

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();
        
        // count
        let countResultQuery = `SELECT qa.test_id, t.test_name, qa.student_id, sr.student_name, qa.final_result FROM questionnaire_answers qa
        LEFT JOIN tests t ON t.test_id = qa.test_id
        LEFT JOIN student_registration sr ON sr.student_id = qa.student_id
        WHERE 1  `;
       
        let results = await connection.query(countResultQuery);
       
        const result = results[0][0];

        // Commit the transaction
        await connection.commit();
        const data = {
            status: 200,
            message: "Result fetched successfully ",
            data:result,   
        };

        return res.status(200).json(data);
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
    getQuestionnaire,
    getStudentTestQuestionnaire,
    createAnswer,
    getAllAnswer,
    getResult,
    getResultDownload,
    getResultDashboard
}