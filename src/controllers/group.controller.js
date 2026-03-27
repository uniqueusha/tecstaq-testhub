
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

//create Group
const createGroup = async (req, res)=>{
    const group_name = req.body.group_name ? req.body.group_name.trim():'';
    const description = req.body.description ? req.body.description.trim():'';
    const user_id = req.companyData.user_id;

    if (!group_name) {
        return error422("Group Name is required.", res);
    } 

    // Check if group already
    const isGroupsExist = "SELECT * FROM groups WHERE group_name  = ?";
    const isGroupsResult = await pool.query(isGroupsExist,[group_name]);
    if (isGroupsResult[0].length > 0) {
        return error422("Groups Name is already exists.", res);
    }

    let connection = await getConnection();

    try {
        // start the transaction
        await connection.beginTransaction();
        const insertQuery = "INSERT INTO groups ( group_name, description, created_by) VALUES (?, ?, ?)";
        const result = await connection.query(insertQuery,[ group_name, description, user_id]);

        await connection.commit()
        return res.status(200).json({
            status:200,
            message:"Group created successfully."
        })
    } catch (error) {
        if (connection) connection.rollback();
        return error500(error, res);
    } finally{
        if (connection) connection.release();
    }
}

//Update Group
const updateGroup = async (req, res) => {
    const groupId = parseInt(req.params.id);
    const group_name = req.body.group_name ? req.body.group_name :'';
    const description = req.body.description ? req.body.description.trim():'';
    
    if (!group_name) {
        return error422("Group Name is required.", res);
    } 

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        // Check if group exists
        const isGroupsExist = "SELECT * FROM groups WHERE group_id  = ?";
        const isGroupsResult = await pool.query(isGroupsExist,[groupId]);
        if (isGroupsResult[0].length == 0) {
            return error422("Groups not found.", res);
        }

        // Update the group record with new data
        const updateQuery = `
            UPDATE groups
            SET group_name = ?, description = ?
            WHERE group_id = ?
        `;

        await connection.query(updateQuery, [ group_name, description, groupId]);
        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "Group updated successfully.",
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

//status change of Group...
const onStatusChange = async (req, res) => {
    const groupId = parseInt(req.params.id);
    const status = parseInt(req.query.status); // Validate and parse the status parameter


    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        // Check if group exists
        const isGroupExist = "SELECT * FROM groups WHERE group_id  = ?";
        const isGroupResult = await pool.query(isGroupExist,[groupId]);
        if (isGroupResult[0].length == 0) {
            return error422("Group not found.", res);
        }

        // Validate the status parameter
        if (status !== 0 && status !== 1) {
            return res.status(400).json({
                status: 400,
                message: "Invalid status value. Status must be 0 (inactive) or 1 (active).",
            });
        }

        // Soft update the Group status
        const updateQuery = `
            UPDATE groups
            SET status = ?
            WHERE group_id = ?
        `;

        await connection.query(updateQuery, [status, groupId]);

        const statusMessage = status === 1 ? "activated" : "deactivated";
        // Commit the transaction
        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: `Group ${statusMessage} successfully.`,
        });
    } catch (error) {
        console.log(error);
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
};

//all Group list
const getAllGroup = async (req, res) => {
    const { page, perPage, key } = req.query;

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        let getGroupQuery = `SELECT * FROM groups`;

        let countQuery = `SELECT COUNT(*) AS total FROM groups `;

        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            if (lowercaseKey === "activated") {
                getGroupQuery += ` AND status = 1`;
                countQuery += ` AND status = 1`;
            } else if (lowercaseKey === "deactivated") {
                getGroupQuery += ` AND status = 0`;
                countQuery += ` AND status = 0`;
            } else {
                getGroupQuery += ` AND LOWER(group_name) LIKE '%${lowercaseKey}%' `;
                countQuery += ` AND LOWER(group_name) LIKE '%${lowercaseKey}%' `;
            }
        }
        getGroupQuery += " ORDER BY cts DESC";

        // Apply pagination if both page and perPage are provided
        let total = 0;
        if (page && perPage) {
            const totalResult = await connection.query(countQuery);
            total = parseInt(totalResult[0][0].total);

            const start = (page - 1) * perPage;
            getGroupQuery += ` LIMIT ${perPage} OFFSET ${start}`;
        }

        const result = await connection.query(getGroupQuery);
        const group = result[0];

        // Commit the transaction
        await connection.commit();
        const data = {
            status: 200,
            message: "Group retrieved successfully",
            data: group,
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

//Group list by id
const getGroup = async (req, res) => {
    const groupId = parseInt(req.params.id);
    
    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        const groupQuery = `SELECT * FROM groups
        WHERE group_id = ?`;
        const groupResult = await connection.query(groupQuery, [groupId]);
        if (groupResult[0].length == 0) {
            return error422("Group Not Found.", res);
        }
        const group = groupResult[0][0];

        return res.status(200).json({
            status: 200,
            message: "Group Retrived Successfully",
            data: group
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

//get group active...
const getGroupWma = async (req, res) => {
   
    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        let groupQuery = `SELECT * FROM groups 
        WHERE status = 1 `;

        groupQuery += ` ORDER BY group_name`;

        const groupResult = await connection.query(groupQuery);
        const group = groupResult[0];

        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "Group retrieved successfully.",
            data: group,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

module.exports = {
    createGroup,
    getAllGroup,
    getGroupWma,
    updateGroup,
    onStatusChange,
    getGroup
    
}