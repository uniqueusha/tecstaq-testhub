
const express = require('express');
const router = express.Router();
const testController = require('../controllers/test.controller');
const checkAuth = require('../middleware/check.auth')

router.post('/', testController.createTest);
//all list
router.get('/', testController.getAllTest);
//active list  
router.get('/wma', testController.getTestWma);
//get list by id
router.get('/:id', testController.getTest);
// update priority
router.put('/:id', testController.updateTest);
//update status
router.patch('/:id', testController.onStatusChange);
module.exports = router;