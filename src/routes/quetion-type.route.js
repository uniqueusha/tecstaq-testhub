
const express = require('express');
const router = express.Router();
const quetionTypeController = require('../controllers/quetion-type.controller');
const checkAuth = require('../middleware/check.auth')

router.post('/', quetionTypeController.createQuetionType);
//all list
router.get('/', quetionTypeController.getAllQuetionType);
//active list  
router.get('/wma', quetionTypeController.getQuetionTypeWma);
//get list by id
router.get('/:id', quetionTypeController.getQuetionType);
// update priority
router.put('/:id', quetionTypeController.updateQuetionType);
//update status
router.patch('/:id', quetionTypeController.onStatusChange);
module.exports = router;