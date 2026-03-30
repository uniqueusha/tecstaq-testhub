
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

//create Quetion Type
const createQuetionType = async (req, res)=>{
    const quetion_type = req.body.quetion_type ? req.body.quetion_type.trim():'';
    const description = req.body.description ? req.body.description.trim():'';
    

    if (!quetion_type) {
        return error422("Quetion Type is required.", res);
    } 

    // Check if quetion type already
    const isQuetionTypeExist = "SELECT * FROM quetion_type WHERE quetion_type  = ?";
    const isQuetionTypeResult = await pool.query(isQuetionTypeExist,[quetion_type]);
    if (isQuetionTypeResult[0].length > 0) {
        return error422("Quetion type is already exists.", res);
    }

    let connection = await getConnection();

    try {
        // start the transaction
        await connection.beginTransaction();
        const insertQuery = "INSERT INTO quetion_type ( quetion_type, description) VALUES (?, ?)";
        const result = await connection.query(insertQuery,[ quetion_type, description]);

        await connection.commit()
        return res.status(200).json({
            status:200,
            message:"Quetion type created successfully."
        })
    } catch (error) {
        if (connection) connection.rollback();
        return error500(error, res);
    } finally{
        if (connection) connection.release();
    }
}

//Update quetion_type
const updateQuetionType = async (req, res) => {
    const quetionTypeId = parseInt(req.params.id);
    const quetion_type = req.body.quetion_type ? req.body.quetion_type :'';
    const description = req.body.description ? req.body.description.trim():'';
    
    if (!quetion_type) {
        return error422("Quetion type is required.", res);
    } 

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        // Check if quetion_type exists
        const isQuetionTypeExist = "SELECT * FROM quetion_type WHERE quetion_type_id  = ?";
        const isQuetionTypeResult = await pool.query(isQuetionTypeExist,[quetionTypeId]);
        if (isQuetionTypeResult[0].length == 0) {
            return error422("Quetion Type not found.", res);
        }

        // Update the QuetionType record with new data
        const updateQuery = `
            UPDATE quetion_type
            SET quetion_type = ?, description = ?
            WHERE quetion_type_id = ?
        `;

        await connection.query(updateQuery, [ quetion_type, description, quetionTypeId]);
        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "Quetion type updated successfully.",
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

//status change of Quetion Type...
const onStatusChange = async (req, res) => {
    const quetionTypeId = parseInt(req.params.id);
    const status = parseInt(req.query.status); // Validate and parse the status parameter


    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        // Check if quetion_type exists
        const isQuetionTypeExist = "SELECT * FROM quetion_type WHERE quetion_type_id  = ?";
        const isQuetionTypeResult = await pool.query(isQuetionTypeExist,[quetionTypeId]);
        if (isQuetionTypeResult[0].length == 0) {
            return error422("Quetion Type not found.", res);
        }

        // Validate the status parameter
        if (status !== 0 && status !== 1) {
            return res.status(400).json({
                status: 400,
                message: "Invalid status value. Status must be 0 (inactive) or 1 (active).",
            });
        }

        // Soft update the Quetion Type status
        const updateQuery = `
            UPDATE quetion_type
            SET status = ?
            WHERE quetion_type_id = ?
        `;

        await connection.query(updateQuery, [status, quetionTypeId]);

        const statusMessage = status === 1 ? "activated" : "deactivated";
        // Commit the transaction
        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: `Quetion type ${statusMessage} successfully.`,
        });
    } catch (error) {
        console.log(error);
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
};

//all quetion_type list
const getAllQuetionType = async (req, res) => {
    const { page, perPage, key } = req.query;

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        let getQuetionTypeQuery = `SELECT * FROM quetion_type`;

        let countQuery = `SELECT COUNT(*) AS total FROM quetion_type `;

        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            if (lowercaseKey === "activated") {
                getQuetionTypeQuery += ` AND status = 1`;
                countQuery += ` AND status = 1`;
            } else if (lowercaseKey === "deactivated") {
                getQuetionTypeQuery += ` AND status = 0`;
                countQuery += ` AND status = 0`;
            } else {
                getQuetionTypeQuery += ` AND LOWER(quetion_type) LIKE '%${lowercaseKey}%' `;
                countQuery += ` AND LOWER(quetion_type) LIKE '%${lowercaseKey}%' `;
            }
        }
        getQuetionTypeQuery += " ORDER BY cts DESC";

        // Apply pagination if both page and perPage are provided
        let total = 0;
        if (page && perPage) {
            const totalResult = await connection.query(countQuery);
            total = parseInt(totalResult[0][0].total);

            const start = (page - 1) * perPage;
            getQuetionTypeQuery += ` LIMIT ${perPage} OFFSET ${start}`;
        }

        const result = await connection.query(getQuetionTypeQuery);
        const quetionType = result[0];

        // Commit the transaction
        await connection.commit();
        const data = {
            status: 200,
            message: "Quetion Type retrieved successfully",
            data: quetionType,
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

//Quetion Type list by id
const getQuetionType = async (req, res) => {
    const quetionTypeId = parseInt(req.params.id);
    
    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        const quetionTypeQuery = `SELECT * FROM quetion_type
        WHERE quetion_type_id = ?`;
        const quetionTypeResult = await connection.query(quetionTypeQuery, [quetionTypeId]);
        if (quetionTypeResult[0].length == 0) {
            return error422("Quetion Type Not Found.", res);
        }
        const quetionType = quetionTypeResult[0][0];

        return res.status(200).json({
            status: 200,
            message: "Quetion type Retrived Successfully",
            data: quetionType
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

//get quetion Type active...
const getQuetionTypeWma = async (req, res) => {
   
    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        let quetionTypeQuery = `SELECT * FROM quetion_type 
        WHERE status = 1 `;

        quetionTypeQuery += ` ORDER BY quetion_type ASC`;

        const quetionTypeResult = await connection.query(quetionTypeQuery);
        const quetionType = quetionTypeResult[0];

        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "Quetion Type retrieved successfully.",
            data: quetionType,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

module.exports = {
    createQuetionType,
    getAllQuetionType,
    getQuetionTypeWma,
    updateQuetionType,
    onStatusChange,
    getQuetionType
    
}