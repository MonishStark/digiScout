@echo off
REM Digital Scout - GCP Upload Script
REM This script uploads your application to the GCP VM

setlocal enabledelayedexpansion

echo.
echo ========================================
echo DIGITAL SCOUT - GCP UPLOAD
echo ========================================
echo.

REM VM Details
set VM_NAME=instance-20260512-072402
set VM_ZONE=us-central1-a
set VM_IP=34.134.50.99
set VM_USER=ubuntu
set REMOTE_PATH=/opt/digitalscout/

REM Local source
set SOURCE_DIR=c:\Users\Dhanush\Downloads\zip

echo Uploading to GCP VM...
echo VM:           %VM_NAME%
echo Zone:         %VM_ZONE%
echo IP:           %VM_IP%
echo Source:       %SOURCE_DIR%
echo Destination:  %REMOTE_PATH%
echo.

REM Try Method 1: gcloud
where gcloud >nul 2>&1
if %errorlevel% equ 0 (
    echo [Method 1] Using gcloud scp...
    gcloud compute scp --recurse ^
      --exclude=.git/* ^
      --exclude=node_modules/* ^
      --exclude=.env.local ^
      "%SOURCE_DIR%" %VM_NAME%:%REMOTE_PATH% ^
      --zone=%VM_ZONE%
    goto :success
)

REM Try Method 2: SSH with SCP
echo [Method 2] Trying SSH/SCP...
where scp >nul 2>&1
if %errorlevel% equ 0 (
    echo Creating tar archive for faster transfer...
    cd /d "%SOURCE_DIR%"
    tar --exclude=.git --exclude=node_modules --exclude=.env.local -czf digitalscout.tar.gz *.* src docker dist
    
    echo Uploading via SCP...
    scp -r digitalscout.tar.gz %VM_USER%@%VM_IP%:%REMOTE_PATH%
    
    if %errorlevel% equ 0 (
        echo.
        echo Uploaded! Now SSH into VM and extract:
        echo ssh %VM_USER%@%VM_IP%
        echo cd %REMOTE_PATH%
        echo tar -xzf digitalscout.tar.gz
        echo rm digitalscout.tar.gz
        echo.
        del digitalscout.tar.gz
        goto :success
    )
)

REM If both fail
echo.
echo [Manual Upload Required]
echo gcloud and scp not found. Please either:
echo.
echo Option 1: Install Google Cloud SDK
echo   https://cloud.google.com/sdk/docs/install-sdk#windows
echo.
echo Option 2: Use GCP Console SSH
echo   1. Open: https://console.cloud.google.com/
echo   2. Go to: Compute Engine ^> VM Instances
echo   3. Click SSH button for %VM_NAME%
echo   4. Run: sudo mkdir -p /opt/digitalscout ^&^& cd /opt/digitalscout
echo   5. Upload via browser or use: cat ^< localfile ^> /opt/digitalscout/file
echo.
echo Option 3: Use WinSCP (GUI tool)
echo   1. Download: https://winscp.net/
echo   2. Connect to: %VM_IP% (SSH, port 22)
echo   3. Drag-drop files to /opt/digitalscout/
echo.
pause
goto :end

:success
echo.
echo ✅ Upload complete!
echo.
echo Next steps:
echo 1. SSH into VM: ssh %VM_USER%@%VM_IP%
echo 2. Navigate: cd /opt/digitalscout
echo 3. Deploy: docker-compose up -d
echo 4. Wait 60 seconds for services to start
echo 5. Check health: curl http://localhost/health
echo.
pause
goto :end

:end
endlocal
