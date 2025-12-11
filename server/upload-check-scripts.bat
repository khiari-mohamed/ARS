@echo off
echo Uploading check scripts to server...
scp check-db-schema.js arsadmin@arshosting:/home/yourapp/server/
scp check-prisma-client.js arsadmin@arshosting:/home/yourapp/server/
echo Done!
pause
