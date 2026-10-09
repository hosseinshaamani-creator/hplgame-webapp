@echo off
cd /d "%~dp0"
echo HPLGAME: http://127.0.0.1:4182/
echo Keep this window open while using the site.
python -m http.server 4182 --bind 127.0.0.1
pause
