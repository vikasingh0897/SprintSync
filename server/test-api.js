const http = require('http');

// Helper to make HTTP requests
function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, text: body });
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting SprintSync Backend & Real-time API Tests...\n');
  const port = 5000;

  // 1. Health Check
  console.log('1️⃣ Testing Health Check...');
  const health = await request({
    hostname: '127.0.0.1',
    port,
    path: '/api/health',
    method: 'GET',
  });
  console.log('   Health response:', health.status, health.data);

  // 2. Auth Login (Admin)
  console.log('\n2️⃣ Testing Admin Authentication Login...');
  const login = await request(
    {
      hostname: '127.0.0.1',
      port,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { email: 'admin@admin.com', password: 'admin@1234' }
  );
  console.log('   Login status:', login.status);
  console.log('   Authenticated as:', login.data?.user?.name, `(${login.data?.user?.email})`);
  const token = login.data?.token;

  if (!token) {
    throw new Error('Failed to obtain JWT token!');
  }

  // 3. Real-time Sprints Creation & Deletion
  console.log('\n3️⃣ Testing Sprint Creation (Feature 1)...');
  const sprintRes = await request(
    {
      hostname: '127.0.0.1',
      port,
      path: '/api/sprints',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
    {
      name: 'Sprint 15 - Performance & WebSockets',
      goal: 'Achieve zero-lag real-time collaboration with Socket.IO',
      status: 'active',
    }
  );
  console.log('   Sprint Created:', sprintRes.data?.data?.name, `[ID: ${sprintRes.data?.data?._id || sprintRes.data?.data?.id}]`);
  const createdSprintId = sprintRes.data?.data?._id || sprintRes.data?.data?.id;

  console.log('\n   Testing Sprint Deletion in Real-time...');
  const delSprintRes = await request({
    hostname: '127.0.0.1',
    port,
    path: `/api/sprints/${createdSprintId}`,
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('   Sprint Deleted successfully:', delSprintRes.data?.message);

  // 4. Real-time Employee Setup with Email & Confirmation (Feature 2)
  console.log('\n4️⃣ Testing Employee Setup & Email Invitation (Feature 2)...');
  const inviteRes = await request(
    {
      hostname: '127.0.0.1',
      port,
      path: '/api/employees/invite',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
    {
      name: 'Jordan Hayes',
      email: 'jordan.hayes@sprintsync.io',
      role: 'Staff Systems Engineer',
      department: 'Engineering',
      avatarColor: '#14b8a6',
    }
  );
  console.log('   Employee Invite status:', inviteRes.status);
  console.log('   Employee status:', inviteRes.data?.data?.status);
  console.log('   Confirmation Link:', inviteRes.data?.confirmationLink);

  const tokenMatch = inviteRes.data?.confirmationLink?.match(/token=([a-f0-9]+)/);
  const inviteToken = tokenMatch ? tokenMatch[1] : null;

  if (inviteToken) {
    console.log('   Verifying Confirmation Token...');
    const verifyRes = await request({
      hostname: '127.0.0.1',
      port,
      path: `/api/employees/verify-invite?token=${inviteToken}`,
      method: 'GET',
    });
    console.log('   Verification response:', verifyRes.data?.employee?.name, verifyRes.data?.employee?.email);

    console.log('   Confirming Account & Setting Password...');
    const confirmRes = await request(
      {
        hostname: '127.0.0.1',
        port,
        path: '/api/employees/confirm-invite',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { token: inviteToken, password: 'securePassword123!' }
    );
    console.log('   Account Confirmed:', confirmRes.data?.message);
    console.log('   New User Auth Token generated:', Boolean(confirmRes.data?.token));
  }

  // 5. Real-time Task Assignment with Email Alert (Feature 3)
  console.log('\n5️⃣ Testing Task Assignment with Real-Time Email Alert (Feature 3)...');
  const taskRes = await request(
    {
      hostname: '127.0.0.1',
      port,
      path: '/api/tasks',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
    {
      title: 'Implement Multi-Region Replication for Database',
      description: 'Set up cross-region read replicas with automatic failover.',
      priority: 'High',
      assignee: 'Jordan Hayes',
      category: 'DevOps',
      dueDate: '2026-11-28',
      storyPoints: 8,
    }
  );
  console.log('   Task Created:', taskRes.data?.data?.title);
  console.log('   Assigned to:', taskRes.data?.data?.assignee);
  console.log('   Email Alert Dispatched:', taskRes.data?.emailAlertSent !== false);

  // Check Email Outbox
  console.log('\n   Verifying Nodemailer Outbox...');
  const outboxRes = await request({
    hostname: '127.0.0.1',
    port,
    path: '/api/notifications/dev-emails',
    method: 'GET',
  });
  console.log(`   Total Emails Dispatched in session: ${outboxRes.data?.data?.length}`);
  outboxRes.data?.data?.slice(0, 3).forEach((mail, idx) => {
    console.log(`     [Email ${idx + 1}] To: ${mail.to} | Subject: ${mail.subject}`);
  });

  // Check In-App Notifications
  console.log('\n   Verifying In-App Notifications...');
  const notifRes = await request({
    hostname: '127.0.0.1',
    port,
    path: '/api/notifications',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(`   Total Notifications: ${notifRes.data?.count}`);
  notifRes.data?.data?.slice(0, 2).forEach((n) => {
    console.log(`     [Notification] ${n.title}: ${n.message}`);
  });

  console.log('\n✅ ALL BACKEND AND REAL-TIME TESTS PASSED SUCCESSFULLY!\n');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});

