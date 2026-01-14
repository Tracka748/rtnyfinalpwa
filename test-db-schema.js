// Test script to verify database schema and service role key
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

// Read .env.local manually
const envContent = fs.readFileSync('.env.local', 'utf8')
const envVars = {}
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/)
  if (match) {
    envVars[match[1].trim()] = match[2].trim()
  }
})

const supabaseAdmin = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY
)

async function testSchema() {
  console.log('🔍 Testing database schema and service role key...\n')

  // Test 1: Check orders table schema
  console.log('1️⃣ Checking orders table...')
  const { data: ordersData, error: ordersError } = await supabaseAdmin
    .from('orders')
    .select('*')
    .limit(1)

  if (ordersError) {
    console.error('❌ Orders table error:', ordersError.message)
  } else {
    console.log('✅ Orders table accessible')
    if (ordersData && ordersData.length > 0) {
      console.log('📋 Sample columns:', Object.keys(ordersData[0]).join(', '))
    }
  }

  // Test 2: Check tickets table schema
  console.log('\n2️⃣ Checking tickets table...')
  const { data: ticketsData, error: ticketsError } = await supabaseAdmin
    .from('tickets')
    .select('*')
    .limit(1)

  if (ticketsError) {
    console.error('❌ Tickets table error:', ticketsError.message)
  } else {
    console.log('✅ Tickets table accessible')
    if (ticketsData && ticketsData.length > 0) {
      console.log('📋 Sample columns:', Object.keys(ticketsData[0]).join(', '))
    }
  }

  // Test 3: Try to insert a test order (then delete it)
  console.log('\n3️⃣ Testing order insert (service role bypass RLS)...')
  const testOrder = {
    user_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
    event_id: '00000000-0000-0000-0000-000000000000',
    order_number: 'TEST-' + Date.now(),
    total_amount: 10.00,
    subtotal: 9.00,
    fees: 1.00,
    payment_status: 'paid', // Use valid enum value
    payment_method: 'card',
    payment_intent_id: 'test_pi',
    transaction_id: 'test_txn',
    status: 'completed' // Use valid enum value
  }

  const { data: insertedOrder, error: insertError } = await supabaseAdmin
    .from('orders')
    .insert(testOrder)
    .select()
    .single()

  if (insertError) {
    console.error('❌ Insert failed:', insertError.message)
    console.error('Details:', insertError)
  } else {
    console.log('✅ Order inserted successfully with ID:', insertedOrder.id)

    // Clean up test order
    const { error: deleteError } = await supabaseAdmin
      .from('orders')
      .delete()
      .eq('id', insertedOrder.id)

    if (deleteError) {
      console.warn('⚠️ Could not delete test order:', deleteError.message)
    } else {
      console.log('✅ Test order cleaned up')
    }
  }

  console.log('\n✨ Schema test complete!')
}

testSchema().catch(console.error)
