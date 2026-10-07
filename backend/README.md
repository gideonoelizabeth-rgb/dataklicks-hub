# Registrations backend (Google Sheet + Gmail)

Every registration from the website is saved as a row in a Google Sheet you own,
the registrant gets a confirmation email listing everything they have registered
for, and you get an hourly "New registrations" summary email. Setting a row's
**Status** to **Paid** emails the registrant a payment confirmation.

No server, no paid service. Setup takes about 10 minutes, once.

## One-time setup

1. **Create the sheet.** Go to <https://sheets.new> signed in as the Google account
   that should own the data and send the emails (use `dataklickshub@gmail.com`).
   Name it "DataKlicks Hub Registrations".
2. **Add the script.** In the sheet: **Extensions → Apps Script**. Delete the
   default code, paste the whole of `Code.gs` from this folder, click **Save**.
3. **Run setup.** In the toolbar choose the function **setup** and click **Run**.
   Google asks for permission:
   - Choose your account → **Advanced** → **Go to (project name) (unsafe)** → **Allow**.
   - The "unsafe" warning is normal for any script you wrote yourself and have not
     submitted to Google for review.
   - You will get a "setup complete" email, and the sheet will now have a
     **Registrations** tab and a **Dashboard** tab.
4. **Publish it as a web app.** **Deploy → New deployment → gear icon → Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Click **Deploy** and copy the **Web app URL** (it ends in `/exec`).
5. **Connect the website.** Put that URL in `site/js/config.js` as `endpoint`
   (or send it to whoever maintains the site), then deploy the site.
6. **Turn on visitor stats.** In Vercel: your project → **Analytics** tab → **Enable**.

## Test it

1. Open `/enrol?course=sql` on the live site and register with your own email.
2. Check: a new row in **Registrations** (its **Email status** column says
   `Sent ...`) and a confirmation email in your inbox. The admin summary email
   arrives within the hour.
3. In the sheet, change that row's **Status** to **Paid**. A "Payment confirmed"
   email should arrive within a few seconds.
4. Delete the test row.

## Day to day

- A registrant sends their receipt on WhatsApp → find their row → set **Status** to
  **Paid**. They are emailed automatically (once only).
- The **Dashboard** tab shows totals, revenue, and registrations by course,
  country and source.
- Share the sheet with teammates the same way as any Google Sheet.

## Changing prices or courses

Edit `CONFIG.COURSES` at the top of `Code.gs` (this is where the real price lives),
save, then **Deploy → Manage deployments → pencil icon → Version: New version →
Deploy**. Also update the displayed price in `site/js/config.js`.

## Payment reminder (the follow-up email)

Right after someone registers they get a "Registration received" email with the payment
details. If they are still **Pending** after a while, an hourly timer sends them one
reminder that repeats the amount, the bank details and the WhatsApp receipt button.

- Sent **once** per registration (the time is recorded in the **Reminder sent** column).
- Never sent to people who are Paid, Cancelled or registered free.
- Waits `FOLLOW_UP_AFTER_HOURS` (24) by default; a course can set its own
  `followUpAfterHours` (the class uses 12). Not sent for a registration older than
  `FOLLOW_UP_MAX_AGE_DAYS` (14), and not sent once a course's `closesAt` time has passed
  (the class stops at its start time).
- Keeps `EMAIL_RESERVE_FOR_NEW_SIGNUPS` (20) of the daily email allowance free so new
  sign-ups are always confirmed. Held-back reminders go out on a later hour.
- The timer is installed by running **setup** (safe to run again). To stop reminders,
  delete the `sendFollowUps` trigger under the clock icon in Apps Script.
- Before running setup the first time, set anyone who has already paid to **Paid** and
  test rows to **Cancelled**, or they will get a reminder within the hour.

## Discount codes

Codes are listed in `CONFIG.DISCOUNTS` at the top of `Code.gs` (never on the website):

```
'50tech':   { percent: 50,  courses: ['ai-class'], maxUses: 10 },
'freetech': { percent: 100, courses: ['ai-class'], maxUses: 10 }
```

- `percent: 100` means free. Free registrations are marked **Paid** automatically.
- `maxUses` is how many people can use the code. Uses are counted from the **Notes**
  column, so do not edit that column. Setting a row's Status to **Cancelled** frees its
  place for someone else. Leave `maxUses` out for an unlimited code.
- To add or change a code, edit the list, save, then **Deploy → Manage deployments →
  pencil icon → New version → Deploy**.

## When someone says they did not get the email

Every registration row has an **Email status** column:

- `Sent 7 Oct 14:05` - Gmail accepted the email. If they cannot find it, ask them to check
  **Spam / Promotions** and mark it "Not spam", and to check the address on their row for typos.
- `NOT SENT: daily email limit reached` (or another reason) - the registration is saved
  but the email did not go out. The hourly timer retries it automatically for 72 hours,
  and also re-sends it if the person registers again.
- `Paid email sent ...` / `Paid email NOT sent: ...` - the result of the "Payment confirmed" email.

Two functions you can run by hand (select it in the Apps Script editor, click **Run**):

- **checkEmailHealth** - counts sent / not sent, lists the reasons, and shows how much of
  today's email allowance is left. It is also emailed to you.
- **resendMissedConfirmations** - run once after upgrading. It emails everyone from the
  last 72 hours who is Pending (or registered free) and whose Email status is blank or
  `NOT SENT`. Someone who did get the first email may get it a second time.

Opening the web app URL in a browser also shows `emailQuotaRemaining` and `emailsSentToday`.

You get one summary email an hour instead of one per registration (this halves the emails
used per sign-up). To get an instant email per registration again, set
`ADMIN_EMAIL_MODE: 'instant'` in `Code.gs`.

## Limits

- Gmail allows about 100 emails a day on a free account. The script stops sending
  at 90 a day but still saves every registration, and retries unsent confirmations
  the next hour.
- The sheet is the database. Do not rename the **Registrations** tab or reorder the
  columns.
