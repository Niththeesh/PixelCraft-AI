const { getSupabaseClient } = require('../server/config/supabaseClient');

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('====================================================');
  console.log('      STEP 10 END-TO-END VERIFICATION SUITE         ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  const client = getSupabaseClient();
  const testEmailA = `test_user_a_${Date.now()}@gmail.com`;
  const testPassword = 'Password123!Secure';
  let tokenA = null;
  let userA = null;
  let convA = null;

  const testEmailB = `test_user_b_${Date.now()}@gmail.com`;
  let tokenB = null;
  let userB = null;

  try {
    // 1. Health checks
    console.log('--- 1. Testing System Health Endpoints ---');
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    const healthData = await healthRes.json();
    assert(healthRes.ok && healthData.status === 'success', 'GET /api/health returns status success');

    const dbHealthRes = await fetch(`${BASE_URL}/api/db/health`);
    const dbHealthData = await dbHealthRes.json();
    assert(dbHealthRes.ok && dbHealthData.status === 'CONNECTED', 'GET /api/db/health returns CONNECTED');

    // 2. Unauthenticated direct Gemini chat
    console.log('\n--- 2. Testing Unauthenticated Gemini Chat ---');
    const chatDirectRes = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Respond with the word "Antigravity" only.' })
    });
    const chatDirectData = await chatDirectRes.json();
    assert(chatDirectRes.ok && chatDirectData.success && typeof chatDirectData.reply === 'string', 'POST /api/chat works without authentication');

    // 3. Unauthorized access rejection
    console.log('\n--- 3. Testing Unauthorized Access Rejection ---');
    const unauthConvRes = await fetch(`${BASE_URL}/api/conversations`);
    assert(unauthConvRes.status === 401, 'GET /api/conversations rejects unauthenticated request with 401');

    const unauthPostConv = await fetch(`${BASE_URL}/api/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Hacked conversation' })
    });
    assert(unauthPostConv.status === 401, 'POST /api/conversations rejects unauthenticated request with 401');

    // 4. Supabase Auth Sign Up (User A)
    console.log('\n--- 4. Testing Supabase Auth Sign Up (User A) ---');
    const signupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmailA, password: testPassword })
    });
    const signupData = await signupRes.json();
    assert(signupRes.status === 201 && signupData.success, 'POST /api/auth/signup creates user successfully');
    assert(!!signupData.session?.access_token, 'POST /api/auth/signup returns valid Supabase session access_token');
    tokenA = signupData.session?.access_token;
    userA = signupData.session?.user;

    // 5. Supabase Auth Login (User A)
    console.log('\n--- 5. Testing Supabase Auth Login (User A) ---');
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmailA, password: testPassword })
    });
    const loginData = await loginRes.json();
    assert(loginRes.status === 200 && loginData.success && !!loginData.session?.access_token, 'POST /api/auth/login validates credentials and issues JWT');

    // 6. Verify Authenticated Session
    console.log('\n--- 6. Testing Session Verification ---');
    const sessionRes = await fetch(`${BASE_URL}/api/auth/session`, {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    const sessionData = await sessionRes.json();
    assert(sessionRes.ok && sessionData.user?.id === userA.id, 'GET /api/auth/session verifies Supabase JWT and returns user');

    // 7. Safe Config Check (Never exposes SECRET KEY)
    console.log('\n--- 7. Testing Auth Config Security ---');
    const configRes = await fetch(`${BASE_URL}/api/auth/config`);
    const configData = await configRes.json();
    assert(configRes.ok && configData.supabaseUrl && !configData.SUPABASE_SECRET_KEY, 'GET /api/auth/config returns public URL without exposing secret keys');

    // 8. Authenticated Conversation Creation
    console.log('\n--- 8. Testing Authenticated Conversation Creation ---');
    const createConvRes = await fetch(`${BASE_URL}/api/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify({ title: 'User A Secret Conversation' })
    });
    const createConvData = await createConvRes.json();
    assert(createConvRes.status === 201 && createConvData.conversation?.id, 'POST /api/conversations creates conversation');
    assert(createConvData.conversation?.user_id === userA.id, `Conversation is strictly owned by User A (user_id: ${userA.id})`);
    convA = createConvData.conversation;

    // 9. List User A Conversations
    console.log('\n--- 9. Testing User A Conversation Listing ---');
    const listConvRes = await fetch(`${BASE_URL}/api/conversations`, {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    const listConvData = await listConvRes.json();
    assert(listConvRes.ok && listConvData.conversations.some(c => c.id === convA.id), 'GET /api/conversations returns User A conversation');

    // 10. Authenticated Chat Flow with Persistence
    console.log('\n--- 10. Testing Chat with Conversation Persistence ---');
    const chatPersistRes = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        message: 'Tell me a 5-word motto.',
        conversationId: convA.id
      })
    });
    const chatPersistData = await chatPersistRes.json();
    assert(chatPersistRes.ok && chatPersistData.success && typeof chatPersistData.reply === 'string', 'POST /api/chat with conversationId generates reply');

    // Verify messages saved in database
    const messagesRes = await fetch(`${BASE_URL}/api/conversations/${convA.id}/messages`, {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    const messagesData = await messagesRes.json();
    assert(messagesRes.ok && messagesData.messages.length >= 2, `Persisted messages found in conversation (${messagesData.messages?.length} messages)`);

    // 11. Multi-Tenant User Isolation (Create User B)
    console.log('\n--- 11. Testing Multi-Tenant Isolation (User B vs User A) ---');
    const signupBRes = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmailB, password: testPassword })
    });
    const signupBData = await signupBRes.json();
    tokenB = signupBData.session?.access_token;
    userB = signupBData.session?.user;
    assert(!!tokenB, 'Created User B successfully');

    // User B tries to read User A's messages -> Must fail with 404/Unauthorized
    const userBAccessA = await fetch(`${BASE_URL}/api/conversations/${convA.id}/messages`, {
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    assert(userBAccessA.status === 404, `User B reading User A conversation returns ${userBAccessA.status} (Access Denied)`);

    // User B lists conversations -> Must NOT include User A's conversation
    const userBList = await fetch(`${BASE_URL}/api/conversations`, {
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    const userBListData = await userBList.json();
    const hasAConv = userBListData.conversations?.some(c => c.id === convA.id);
    assert(!hasAConv, "User B conversation list does NOT leak User A's conversation");

    // User B tries to delete User A's conversation -> Must fail with 404
    const userBDeleteA = await fetch(`${BASE_URL}/api/conversations/${convA.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    assert(userBDeleteA.status === 404, `User B deleting User A conversation returns ${userBDeleteA.status} (Access Denied)`);

    // User A deletes own conversation -> Must succeed
    const userADeleteOwn = await fetch(`${BASE_URL}/api/conversations/${convA.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    assert(userADeleteOwn.ok, 'User A can delete their own conversation successfully');

    // Verify messages cascaded
    const checkDeletedMessages = await fetch(`${BASE_URL}/api/conversations/${convA.id}/messages`, {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    assert(checkDeletedMessages.status === 404, 'Deleted conversation messages are no longer accessible');

  } catch (err) {
    console.error('Fatal test runner error:', err);
    failed++;
  } finally {
    console.log('\n--- Cleaning up test users ---');
    if (client && userA?.id) {
      await client.auth.admin.deleteUser(userA.id);
      console.log('Cleaned up test User A');
    }
    if (client && userB?.id) {
      await client.auth.admin.deleteUser(userB.id);
      console.log('Cleaned up test User B');
    }
  }

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
