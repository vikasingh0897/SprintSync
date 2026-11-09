const express = require('express');
const router = express.Router();
const {
  getEmployees,
  inviteEmployee,
  verifyInviteToken,
  confirmInvite,
  resendConfirmation,
  updateEmployee,
  deleteEmployee,
} = require('../controllers/employeeController');
const { protect } = require('../middleware/auth');

// Public confirmation routes
router.get('/verify-invite', verifyInviteToken);
router.post('/confirm-invite', confirmInvite);

// Protected routes
router.use(protect);
router.route('/')
  .get(getEmployees);

router.post('/invite', inviteEmployee);
router.post('/:id/resend-confirmation', resendConfirmation);

router.route('/:id')
  .put(updateEmployee)
  .delete(deleteEmployee);

module.exports = router;

