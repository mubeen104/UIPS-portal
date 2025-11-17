# Quick Start: Real-Time Attendance System

## 🚀 Get Started in 5 Minutes

### Step 1: Start the Bridge Service

```bash
cd biometric-bridge
npm install
npm start
```

Expected output:
```
✓ Biometric Bridge Service running on port 3001
✓ Health check: http://localhost:3001/health
```

### Step 2: Enable Auto-Sync

```bash
curl -X POST http://localhost:3001/device/auto-sync/start \
  -H "Content-Type: application/json" \
  -d '{"intervalSeconds": 60}'
```

Expected response:
```json
{
  "success": true,
  "message": "Auto-sync started with 60s interval"
}
```

### Step 3: Open the Web App

1. Open your browser to your app URL
2. Navigate to **Attendance → Live Logs**
3. Look for the green **"Live"** badge with pulsing indicator

### Step 4: Watch It Work

Within 60 seconds, you should see:
- ✅ Simulated attendance logs appearing automatically
- ✅ Toast notification: "New attendance log recorded"
- ✅ No page refresh needed
- ✅ Dashboard counters updating in real-time

## 🎯 What You're Seeing

The system is now:

1. **Every 60 seconds** - Bridge service syncs with devices
2. **Generates 1-3 test logs** - Simulated employee check-ins/check-outs
3. **Pushes to Supabase** - Logs inserted into database
4. **Realtime broadcast** - All connected users notified
5. **UI updates instantly** - Logs appear without refresh

## 📊 Check the Dashboard

Navigate to **Attendance → Dashboard**:
- Watch the "Present" counter increase automatically
- See new entries in "Recent Activity" feed
- Notice "Live Updates" badge

## 🔍 Verify It's Working

### Check Bridge Console
You should see logs like:
```
Syncing attendance logs from ZKTeco device at 192.168.1.100:4370
Generated 3 simulated logs
Successfully pushed 3 logs to database
```

### Check Browser Console
You should see messages like:
```
New attendance log received: {id: "...", log_time: "...", ...}
```

### Check Database
```sql
SELECT * FROM attendance_logs
ORDER BY log_time DESC
LIMIT 10;
```

## 🛠️ Troubleshooting

### No logs appearing?

**Check bridge is running:**
```bash
curl http://localhost:3001/health
```

**Check auto-sync status:**
Look for "Auto-sync started" message in bridge console

**Check browser console:**
Look for Realtime subscription errors

### Bridge won't start?

**Check port availability:**
```bash
lsof -i :3001
```

**Check environment variables:**
```bash
cd biometric-bridge
cat .env
```

Must have:
- `SUPABASE_URL=https://your-project.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY=your-key`

### No real-time updates?

**Enable Realtime in Supabase:**
1. Go to Supabase Dashboard
2. Database → Replication
3. Enable Realtime for `attendance_logs` table

## 🎉 Next Steps

### For Testing
- Let it run for 5-10 minutes
- Watch multiple logs appear
- Test different pages (Dashboard, Logs)
- Verify all counters update automatically

### For Production
1. Integrate real ZKTeco SDK (see `REALTIME_ATTENDANCE_IMPLEMENTATION.md`)
2. Connect to actual fingerprint devices
3. Deploy Edge Functions to Supabase
4. Set up cron jobs for automated sync
5. Configure email/SMS notifications

## 📖 Full Documentation

- **Complete Guide:** `REALTIME_ATTENDANCE_IMPLEMENTATION.md`
- **Summary:** `IMPLEMENTATION_SUMMARY.md`
- **Device Setup:** `FINGERPRINT_DEVICE_SETUP.md`

## 🆘 Need Help?

**Check the logs:**
- Bridge console: Shows sync activity
- Browser console: Shows Realtime events
- Supabase logs: Shows Edge Function execution

**Common fixes:**
1. Restart bridge service
2. Refresh browser page
3. Check Supabase Realtime is enabled
4. Verify database permissions (RLS policies)

## ✅ Success Indicators

You'll know it's working when:
- ✅ "Live" badge visible and pulsing
- ✅ New logs appear automatically
- ✅ Toast notifications show up
- ✅ Dashboard counters update without refresh
- ✅ Bridge console shows sync activity

**Congratulations! Your real-time attendance system is operational! 🎊**

