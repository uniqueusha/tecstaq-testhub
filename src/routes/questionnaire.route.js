
const express = require('express');
const router = express.Router();
const questionnaireController = require('../controllers/questionnaire.controller');
const checkAuth = require('../middleware/check.auth')

router.post('/', questionnaireController.createQuestionnaire);
//all list
router.get('/', questionnaireController.getAllQuestionnaire);
//active list  
router.get('/wma', questionnaireController.getQuestionnaireWma);
//get list by id
router.get('/:id', questionnaireController.getQuestionnaire);
// update priority
router.put('/:id', questionnaireController.updateQuestionnaire);
//update status
router.patch('/:id', questionnaireController.onStatusChange);
module.exports = router;