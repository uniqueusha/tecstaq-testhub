
const express = require('express');
const router = express.Router();
const groupController = require('../controllers/group.controller');
const checkAuth = require('../middleware/check.auth')

router.post('/', checkAuth,groupController.createGroup);
//all list
router.get('/', groupController.getAllGroup);
//active list  
router.get('/wma', groupController.getGroupWma);
//get list by id
router.get('/:id', groupController.getGroup);
// update priority
router.put('/:id', groupController.updateGroup);
//update status
router.patch('/:id', groupController.onStatusChange);
module.exports = router;