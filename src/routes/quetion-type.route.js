
const express = require('express');
const router = express.Router();
const questionTypeController = require('../controllers/quetion-type.controller');
const checkAuth = require('../middleware/check.auth')

router.post('/', questionTypeController.createQuestionType);
//all list
router.get('/', questionTypeController.getAllQuestionType);
//active list  
router.get('/wma', questionTypeController.getQuestionTypeWma);
//get list by id
router.get('/:id', questionTypeController.getQuestionType);
// update priority
router.put('/:id', questionTypeController.updateQuestionType);
//update status
router.patch('/:id', questionTypeController.onStatusChange);
module.exports = router;