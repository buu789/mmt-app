MONEY TRACKER (installable phone app)
=====================================

This app runs fully on your phone. Your money data is saved on the phone only
and is never uploaded anywhere. Once installed it works with no internet.

INSTALL ON ANDROID (needs a free GitHub account, one time)
----------------------------------------------------------
1. Unzip this file (Files app > tap the zip > Extract).
2. In Chrome, open github.com and sign in. Tap the menu (three dots) and
   choose "Desktop site" so the pages are easier to use.
3. Create a new repository: name it  money-tracker , choose Public, Create.
4. Tap "uploading an existing file", select ALL the extracted files
   (index.html, app.js, logic.js, sw.js, manifest.webmanifest, the three
   icon .png files), then tap "Commit changes".
5. Go to Settings > Pages. Under Source choose "Deploy from a branch",
   branch "main", folder "/ (root)", then Save.
6. Wait about a minute, then open
   https://YOUR-USERNAME.github.io/money-tracker/
   in Chrome.
7. Tap the menu (three dots) > "Install app" (or "Add to Home screen").
   The Money Tracker icon now appears on your home screen.

IMPORTANT
---------
* Always open the app from the same address, so it finds your saved data.
* Clearing Chrome's "site data" erases your entries. Use the Backup button
  now and then, and Restore if you ever need it.

CHANGING THE APP LATER
----------------------
* Upload the changed files to the same GitHub repository.
* Open sw.js and change  money-tracker-v1  to  money-tracker-v2  (then v3...)
  so phones download the new version. Open the app twice to see the update.

FILES
-----
index.html            the screen layout and colours
app.js                the buttons and what they do
logic.js              the money and date maths (financial month, totals)
sw.js                 makes the app work offline
manifest.webmanifest  app name, icon and colours for installing
icon-*.png            the app icons
