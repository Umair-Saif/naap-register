# Google Sheet sync (free, no domain / hosting needed)

1. Go to sheets.google.com and create a new blank sheet, name it "Naap Register".
2. Menu: Extensions -> Apps Script.
3. Delete everything there, paste all of `Code.gs`.
4. Change `CHANGE_THIS_SECRET` to your own long secret text (do NOT commit it to GitHub).
5. Click Deploy -> New deployment -> gear icon -> Web app.
   - Execute as: Me
   - Who has access: Anyone
   Click Deploy, then Authorize access (Advanced -> Go to project -> Allow).
6. Copy the "Web app URL" (ends with /exec).
7. Open the app -> "Google Sheet sync" button -> paste the URL and the same secret -> Save and sync.

Do this on every phone that should share the same records. All phones then see the same data and it is stored in your Google Sheet permanently.
If you later edit Code.gs: Deploy -> Manage deployments -> edit -> Version: New version -> Deploy.
