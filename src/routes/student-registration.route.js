
const express = require('express');
const router = express.Router();
const studentController = require('../controllers/student-registration.controller');
const checkAuth = require('../middleware/check.auth')

router.post('/', studentController.createStudent);
//all list
router.get('/', studentController.getAllStudent);
//active list  
router.get('/wma', studentController.getStudentsWma);
//get list by id
router.get('/:id', studentController.getStudent);
// update priority
router.put('/:id', studentController.updateStudent);
//update status
router.patch('/:id', studentController.onStatusChange);
module.exports = router;